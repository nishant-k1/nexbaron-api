import { Request, Response } from 'express'
import { getDivisionModels } from '../../../models/registry'
import { nextCode } from '../../../utils/sequence'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { createProposalModel } from '../../../models/proposal.model'
import { createInvoiceModel } from '../../../models/invoice.model'
import { getPlanById } from '../../digital/controllers/catalog-controller'
import { createPackageModel } from '../../../models/package.model'
import { createPackageServiceModel } from '../../../models/package-service.model'
import { createServiceModel } from '../../../models/service.model'
import { buildBillingView } from '../../billing/services/billing-service'
import { sendMail, canSendMail } from '../../../utils/mailer'
import { renderProposalPdf } from '../services/proposal-pdf'
import { escapeHtml } from '../../../utils/html'

function accountFilterForUser(division: 'digital' | 'print', userId?: string) {
  return { division, userId }
}

type PricingInput = {
  oneTimeEnabled?: boolean
  oneTimeFee?: number
  paymentSchedule?: string
  recurringEnabled?: boolean
  recurringFee?: number
  recurringFrequency?: string
}

function parsePricing(p: PricingInput): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  if (p.oneTimeEnabled !== undefined) out.oneTimeEnabled = !!p.oneTimeEnabled
  if (p.oneTimeFee !== undefined) out.oneTimeFee = Number(p.oneTimeFee)
  if (p.paymentSchedule !== undefined) {
    if (p.paymentSchedule && p.paymentSchedule !== 'FULL_UPFRONT' && p.paymentSchedule !== 'FIFTY_FIFTY') return null
    out.paymentSchedule = p.paymentSchedule
  }
  if (p.recurringEnabled !== undefined) out.recurringEnabled = !!p.recurringEnabled
  if (p.recurringFee !== undefined) out.recurringFee = Number(p.recurringFee)
  if (p.recurringFrequency !== undefined) {
    if (p.recurringFrequency && p.recurringFrequency !== 'MONTHLY' && p.recurringFrequency !== 'ANNUAL') return null
    out.recurringFrequency = p.recurringFrequency
  }
  return out
}

function buildProposalEmailHtml(accountName: string, proposalTitle: string, proposalCode: string, division: string, brandName: string): string {
  const hubUrl = process.env.HUB_URL || 'https://hub.nexbaron.com'
  const proposalUrl = `${hubUrl}/${division}/proposals?proposal=${proposalCode}`
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Hi ${escapeHtml(accountName)},</p>
      <p style="color:#333;font-size:15px;margin:0 0 16px;">We've prepared a proposal for <strong>${escapeHtml(proposalTitle)}</strong>.</p>
      <p style="color:#333;font-size:15px;margin:0 0 16px;">Please review the attached PDF and click below to accept and proceed to payment:</p>
      <p style="margin:24px 0;">
        <a href="${proposalUrl}" style="display:inline-block;padding:12px 28px;background:#14b8a6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Accept proposal</a>
      </p>
      <p style="color:#999;font-size:12px;margin-top:24px;">— ${brandName}</p>
    </div>`
}

export async function createProposalFromPlan(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { planId, billingCycle } = req.body as { planId?: string; billingCycle?: string }
    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' })
      return
    }
    const plan = getPlanById(planId)
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' })
      return
    }
    if (plan.custom) {
      res.status(400).json({
        success: false,
        message: 'Custom plans are prepared by our team — please contact us to request a proposal.',
      })
      return
    }

    const cycle: 'MONTHLY' | 'ANNUAL' = billingCycle === 'annual' ? 'ANNUAL' : 'MONTHLY'
    const { Account, Proposal, Sequence } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(400).json({ success: false, message: 'Account not found' })
      return
    }

    // Idempotency: reuse a pending proposal for the same plan to avoid double-click duplicates.
    // If the latest proposal is already ACCEPTED (terminal — invoice already created, possibly paid),
    // allow a fresh proposal so the same plan can be re-ordered. Uses unique proposalCode per request.
    const existing = await (Proposal as ReturnType<typeof createProposalModel>)
      .findOne({ accountId: account.accountCode, division, packageId: plan.id })
      .sort({ createdAt: -1 })
      .lean()
    if (existing) {
      if (existing.status === 'DRAFT') {
        const updated = await (Proposal as ReturnType<typeof createProposalModel>).findOneAndUpdate(
          { _id: existing._id, division, status: 'DRAFT' },
          { $set: { status: 'SENT' } },
          { new: true }
        )
        if (updated) {
          await Account.updateOne(
            { accountCode: account.accountCode, division, lifecycleStage: { $in: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED'] } },
            { $set: { lifecycleStage: 'PROPOSAL_SENT' }, $push: { stageHistory: { stage: 'PROPOSAL_SENT', by: (account as { name?: string }).name || 'customer', at: new Date() } } }
          ).catch(() => {})

          // Email proposal PDF to customer
          try {
            if (canSendMail() && account.email) {
              const pdf = await renderProposalPdf(updated.toObject(), account)
              const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
              await sendMail({
                from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
                to: account.email,
                subject: `New proposal — ${plan.name} — ${updated.proposalCode}`,
                html: buildProposalEmailHtml(account.name || '', plan.name, updated.proposalCode, division, brandName),
                attachments: [{ filename: `proposal-${updated.proposalCode}.pdf`, content: pdf }],
              })
            }
          } catch (e) {
            console.error('Failed to email proposal', e)
          }
        }
        res.json({ success: true, proposal: updated || existing, existing: true })
        return
      }
      if (existing.status === 'SENT') {
        // Pending — return as-is (idempotent retry)
        res.json({ success: true, proposal: existing, existing: true })
        return
      }
      // ACCEPTED is terminal — fall through to create a fresh proposal with a new proposalCode/invoice
    }

    const pricing = plan.pricing
    const recurringFee =
      cycle === 'ANNUAL'
        ? pricing?.annual ?? pricing?.monthly ?? 0
        : pricing?.monthly ?? 0

    const proposalCode = await nextCode(Sequence, `proposal-${division}`, 'PRP')
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).create({
      proposalCode,
      accountId: account.accountCode,
      packageId: plan.id,
      division,
      version: 1,
      status: 'SENT',
      title: plan.name,
      description: plan.tagline,
      services: (plan.services || []).map((s) => ({
        serviceCode: s.id || (s.label ? s.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'service'),
        name: s.label,
        description: s.description || '',
      })),
      pricing: {
        oneTimeEnabled: !!pricing?.setup,
        oneTimeFee: pricing?.setup || 0,
        paymentSchedule: 'FULL_UPFRONT',
        recurringEnabled: true,
        recurringFee: recurringFee || 0,
        recurringFrequency: cycle,
      },
      createdBy: (account as { name?: string }).name || 'customer',
    })

    // Automatically advance account to PROPOSAL_SENT for standard plans (proposal is sent immediately).
    await Account.updateOne(
      { accountCode: account.accountCode, division, lifecycleStage: { $in: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED'] } },
      {
        $set: { lifecycleStage: 'PROPOSAL_SENT' },
        $push: { stageHistory: { stage: 'PROPOSAL_SENT', by: (account as { name?: string }).name || 'customer', at: new Date() } },
      }
    ).catch(() => {})

    // Email proposal PDF to customer
    try {
      if (canSendMail() && account.email) {
        const pdf = await renderProposalPdf(proposal.toObject(), account)
        const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
        await sendMail({
          from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
          to: account.email,
          subject: `New proposal — ${plan.name} — ${proposal.proposalCode}`,
          html: buildProposalEmailHtml(account.name || '', plan.name, proposal.proposalCode, division, brandName),
          attachments: [{ filename: `proposal-${proposal.proposalCode}.pdf`, content: pdf }],
        })
      }
    } catch (e) {
      console.error('Failed to email proposal', e)
    }

    res.status(201).json({ success: true, proposal: proposal.toObject() })
  } catch (error) {
    return handleError('createProposalFromPlan', req, res, error, 'Failed to create proposal')
  }
}

export async function createProposalFromPackage(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { packageCode } = req.body as { packageCode?: string }
    if (!packageCode) {
      res.status(400).json({ success: false, message: 'packageCode is required' })
      return
    }
    const { Account, Package, PackageService, Service, Proposal, Sequence } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(400).json({ success: false, message: 'Account not found' })
      return
    }
    const pkg = await (Package as ReturnType<typeof createPackageModel>).findOne({
      packageCode,
      accountId: account.accountCode,
      division,
      visibility: { $ne: 'DRAFT' },
    }).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }

    // Idempotency per package: reuse pending (DRAFT/SENT), allow new after ACCEPTED
    const existing = await (Proposal as ReturnType<typeof createProposalModel>)
      .findOne({ accountId: account.accountCode, division, packageId: pkg.packageCode })
      .sort({ createdAt: -1 })
      .lean()
    if (existing) {
      if (existing.status === 'DRAFT') {
        const updated = await (Proposal as ReturnType<typeof createProposalModel>).findOneAndUpdate(
          { _id: existing._id, division, status: 'DRAFT' },
          { $set: { status: 'SENT' } },
          { new: true }
        )
        if (updated) {
          await Account.updateOne(
            { accountCode: account.accountCode, division, lifecycleStage: { $in: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED'] } },
            { $set: { lifecycleStage: 'PROPOSAL_SENT' }, $push: { stageHistory: { stage: 'PROPOSAL_SENT', by: (account as { name?: string }).name || 'customer', at: new Date() } } }
          ).catch(() => {})

          try {
            if (canSendMail() && account.email) {
              const pdf = await renderProposalPdf(updated.toObject(), account)
              const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
              await sendMail({
                from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
                to: account.email,
                subject: `New proposal — ${pkg.name} — ${updated.proposalCode}`,
                html: buildProposalEmailHtml(account.name || '', pkg.name, updated.proposalCode, division, brandName),
                attachments: [{ filename: `proposal-${updated.proposalCode}.pdf`, content: pdf }],
              })
            }
          } catch (e) {
            console.error('Failed to email proposal', e)
          }
        }
        res.json({ success: true, proposal: updated || existing, existing: true })
        return
      }
      if (existing.status === 'SENT') {
        res.json({ success: true, proposal: existing, existing: true })
        return
      }
      // ACCEPTED is terminal — fall through to create a fresh proposal
    }

    // Service snapshot: PackageService -> Service catalog.
    const links = await (PackageService as ReturnType<typeof createPackageServiceModel>)
      .find({ packageCode: pkg.packageCode, division })
      .lean()
    const serviceCodes = links.map((l) => l.serviceCode)
    const svcDocs = serviceCodes.length
      ? await (Service as ReturnType<typeof createServiceModel>).find({ serviceCode: { $in: serviceCodes }, division }).lean()
      : []
    const svcMap = new Map(svcDocs.map((s) => [s.serviceCode, s]))
    const services = links.map((l) => {
      const svc = svcMap.get(l.serviceCode)
      return {
        serviceCode: l.serviceCode,
        name: l.name || (svc ? svc.name : l.serviceCode),
        description: l.description || (svc ? svc.description : ''),
      }
    })

    const pricing = {
      oneTimeEnabled: !!pkg.oneTimeEnabled,
      oneTimeFee: pkg.oneTimeFee || 0,
      paymentSchedule: pkg.paymentSchedule,
      recurringEnabled: !!pkg.recurringEnabled,
      recurringFee: pkg.recurringFee || 0,
      recurringFrequency: pkg.recurringFrequency,
    }

    const proposalCode = await nextCode(Sequence, `proposal-${division}`, 'PRP')
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).create({
      proposalCode,
      accountId: account.accountCode,
      packageId: pkg.packageCode,
      division,
      version: 1,
      status: 'SENT',
      title: pkg.name,
      description: pkg.description || '',
      services,
      pricing,
      createdBy: (account as { name?: string }).name || 'customer',
    })

    // Reflect the selection on the account (only if still early-stage).
    await Account.updateOne(
      { accountCode: account.accountCode, division, lifecycleStage: { $in: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED'] } },
      {
        $set: { lifecycleStage: 'PROPOSAL_SENT' },
        $push: { stageHistory: { stage: 'PROPOSAL_SENT', by: (account as { name?: string }).name || 'customer', at: new Date() } },
      }
    ).catch(() => {})

    // Email proposal PDF to customer
    try {
      if (canSendMail() && account.email) {
        const pdf = await renderProposalPdf(proposal.toObject(), account)
        const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
        await sendMail({
          from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
          to: account.email,
          subject: `New proposal — ${pkg.name} — ${proposal.proposalCode}`,
          html: buildProposalEmailHtml(account.name || '', pkg.name, proposal.proposalCode, division, brandName),
          attachments: [{ filename: `proposal-${proposal.proposalCode}.pdf`, content: pdf }],
        })
      }
    } catch (e) {
      console.error('Failed to email proposal', e)
    }

    res.status(201).json({ success: true, proposal: proposal.toObject() })
  } catch (error) {
    return handleError('createProposalFromPackage', req, res, error, 'Failed to create proposal')
  }
}

export async function getMyProposals(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Proposal } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.json({ success: true, proposals: [] })
      return
    }
    const proposals = await (Proposal as ReturnType<typeof createProposalModel>)
      .find({ accountId: account.accountCode, division, status: { $in: ['SENT', 'ACCEPTED'] } })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, proposals })
  } catch (error) {
    return handleError('getMyProposals', req, res, error, 'Failed to load proposals')
  }
}

export async function listProposals(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Proposal } = getDivisionModels(division)
    const accountCode = req.query.accountCode as string | undefined
    const status = req.query.status as string | undefined
    const filter: Record<string, unknown> = { division }
    if (accountCode) filter.accountId = accountCode
    if (status) filter.status = status
    const proposals = await (Proposal as ReturnType<typeof createProposalModel>)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
    res.json({ success: true, proposals })
  } catch (error) {
    return handleError('listProposals', req, res, error, 'Failed to load proposals')
  }
}

export async function getProposal(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Proposal } = getDivisionModels(division)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>)
      .findOne({ proposalCode: String(req.params.code), division })
      .lean()
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    res.json({ success: true, proposal })
  } catch (error) {
    return handleError('getProposal', req, res, error, 'Failed to load proposal')
  }
}

export async function createProposal(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account, Package, PackageService, Service, Proposal, Sequence } = getDivisionModels(division)
    const { packageId, title, terms, notes } = req.body
    if (!packageId) {
      res.status(400).json({ success: false, message: 'packageId is required' })
      return
    }
    const pkg = await (Package as ReturnType<typeof createPackageModel>).findOne({ packageCode: packageId, division }).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    const account = await Account.findOne({ accountCode: pkg.accountId, division }).lean()
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }

    // Service snapshot: PackageService -> Service catalog (do not depend on live catalog later).
    const links = await (PackageService as ReturnType<typeof createPackageServiceModel>)
      .find({ packageCode: pkg.packageCode, division })
      .lean()
    const serviceCodes = links.map((l) => l.serviceCode)
    const svcDocs = serviceCodes.length
      ? await (Service as ReturnType<typeof createServiceModel>).find({ serviceCode: { $in: serviceCodes }, division }).lean()
      : []
    const svcMap = new Map(svcDocs.map((s) => [s.serviceCode, s]))
    const services = links.map((l) => {
      const svc = svcMap.get(l.serviceCode)
      return {
        serviceCode: l.serviceCode,
        name: l.name || (svc ? svc.name : l.serviceCode),
        description: l.description || (svc ? svc.description : ''),
      }
    })

    // Pricing snapshot from the Package's current commercial configuration.
    const pricing = {
      oneTimeEnabled: !!pkg.oneTimeEnabled,
      oneTimeFee: pkg.oneTimeFee || 0,
      paymentSchedule: pkg.paymentSchedule,
      recurringEnabled: !!pkg.recurringEnabled,
      recurringFee: pkg.recurringFee || 0,
      recurringFrequency: pkg.recurringFrequency,
    }

    const proposalCode = await nextCode(Sequence, `proposal-${division}`, 'PRP')
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).create({
      proposalCode,
      accountId: pkg.accountId,
      packageId: pkg.packageCode,
      division,
      version: 1,
      status: 'DRAFT',
      title: title?.trim() || pkg.name,
      description: pkg.description || '',
      services,
      pricing,
      terms,
      notes,
      createdBy: req.staffAuth.name,
    })
    res.status(201).json({ success: true, proposal: proposal.toObject() })
  } catch (error) {
    return handleError('createProposal', req, res, error, 'Failed to create proposal')
  }
}

export async function updateProposal(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Proposal } = getDivisionModels(division)
    const code = String(req.params.code)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).findOne({ proposalCode: code, division })
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    if (proposal.status === 'ACCEPTED') {
      res.status(403).json({ success: false, message: 'Accepted proposals are immutable' })
      return
    }

    const { title, description, services, pricing, terms, notes } = req.body
    const set: Record<string, unknown> = {}
    if (title !== undefined) set.title = String(title).trim()
    if (description !== undefined) set.description = description
    if (services !== undefined) {
      if (!Array.isArray(services)) {
        res.status(400).json({ success: false, message: 'services must be an array' })
        return
      }
      set.services = services
    }
    if (pricing !== undefined) {
      const parsed = parsePricing(pricing)
      if (!parsed) {
        res.status(400).json({ success: false, message: 'Invalid pricing values' })
        return
      }
      set.pricing = parsed
    }
    if (terms !== undefined) set.terms = terms
    if (notes !== undefined) set.notes = notes

    const op: Record<string, unknown> = { $set: set }
    if (proposal.status === 'SENT') op.$inc = { version: 1 }

    const updated = await (Proposal as ReturnType<typeof createProposalModel>).findOneAndUpdate(
      { proposalCode: code, division },
      op,
      { new: true }
    )
    res.json({ success: true, proposal: updated?.toObject() })
  } catch (error) {
    return handleError('updateProposal', req, res, error, 'Failed to update proposal')
  }
}

export async function sendProposal(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account, Proposal } = getDivisionModels(division)
    const code = String(req.params.code)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).findOne({ proposalCode: code, division }).lean()
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    if (proposal.status === 'ACCEPTED') {
      res.status(400).json({ success: false, message: 'Cannot send an accepted proposal' })
      return
    }
    if (proposal.status === 'SENT') {
      res.json({ success: true, proposal })
      return
    }
    const updated = await (Proposal as ReturnType<typeof createProposalModel>).findOneAndUpdate(
      { proposalCode: code, division, status: 'DRAFT' },
      { $set: { status: 'SENT' } },
      { new: true }
    )
    if (updated) {
      // Monotone — only advance, never regress CUSTOMER/PAYMENT_PENDING back to SENT
      await Account.updateOne(
        { accountCode: updated.accountId, division, lifecycleStage: { $in: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED'] } },
        {
          $set: { lifecycleStage: 'PROPOSAL_SENT' },
          $push: { stageHistory: { stage: 'PROPOSAL_SENT', by: req.staffAuth.name, at: new Date() } },
        }
      )

      // Email proposal PDF to customer
      try {
        const { Account: Acct } = getDivisionModels(division)
        const accountDoc = await Acct.findOne({ accountCode: updated.accountId, division }).lean()
        if (canSendMail() && (accountDoc as any)?.email) {
          const pdf = await renderProposalPdf(updated.toObject(), accountDoc)
          const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
          await sendMail({
            from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
            to: (accountDoc as any).email,
            subject: `New proposal — ${updated.title} — ${updated.proposalCode}`,
            html: buildProposalEmailHtml((accountDoc as any)?.name || '', updated.title, updated.proposalCode, division, brandName),
            attachments: [{ filename: `proposal-${updated.proposalCode}.pdf`, content: pdf }],
          })
        }
      } catch (e) {
        console.error('Failed to email proposal', e)
      }
    }
    res.json({ success: true, proposal: updated?.toObject() })
  } catch (error) {
    return handleError('sendProposal', req, res, error, 'Failed to send proposal')
  }
}

export async function acceptProposal(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { accept } = req.body as { accept?: boolean }
    if (accept !== true) {
      res.status(400).json({ success: false, message: 'Explicit acceptance is required' })
      return
    }
    const { Account, Proposal } = getDivisionModels(division)
    const code = String(req.params.code)
    // Ownership first — fetch any proposal with this code, verify ownership before any state change
    const anyProposal = await (Proposal as ReturnType<typeof createProposalModel>).findOne({ proposalCode: code, division }).lean()
    if (!anyProposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account || account.accountCode !== anyProposal.accountId) {
      res.status(403).json({ success: false, message: 'This proposal is not linked to your account' })
      return
    }
    if (anyProposal.status === 'ACCEPTED') {
      res.json({ success: true, proposal: anyProposal })
      return
    }
    if (anyProposal.status !== 'SENT') {
      res.status(400).json({ success: false, message: 'Proposal is not available for acceptance' })
      return
    }
    // Atomic transition SENT -> ACCEPTED (prevents double invoice on double-click/race)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>).findOneAndUpdate(
      { proposalCode: code, division, status: 'SENT' },
      { $set: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: account.name || account.email || account.accountCode, acceptedVersion: anyProposal.version } },
      { new: true }
    )
    if (!proposal) {
      // Lost race — another request already accepted; return idempotent
      const raced = await (Proposal as ReturnType<typeof createProposalModel>).findOne({ proposalCode: code, division }).lean()
      if (raced && raced.status === 'ACCEPTED') {
        res.json({ success: true, proposal: raced })
        return
      }
      res.status(400).json({ success: false, message: 'Proposal is not available for acceptance' })
      return
    }
    // Monotone lifecycle — don't regress a CUSTOMER (second purchase) back to PROPOSAL_ACCEPTED
    await Account.updateOne(
      { accountCode: proposal.accountId, division, lifecycleStage: { $ne: 'CUSTOMER' } },
      {
        $set: { lifecycleStage: 'PROPOSAL_ACCEPTED' },
        $push: { stageHistory: { stage: 'PROPOSAL_ACCEPTED', by: account.name, at: new Date() } },
        $addToSet: { tags: 'proposal-accepted' },
      }
    )

    // Auto-create PENDING invoice — idempotent per proposalCode (handles accept double-click/orphan race)
    const { Invoice, Sequence } = getDivisionModels(division)
    const existingInvoice = await (Invoice as ReturnType<typeof createInvoiceModel>).findOne({ proposalCode: proposal.proposalCode, division }).lean()
    if (existingInvoice) {
      res.json({ success: true, proposal: proposal.toObject() })
      return
    }
    const invoiceCode = await nextCode(Sequence, `invoice-${division}`, 'INV')
    const pricing = proposal.pricing
    const lineItems: Array<{ label: string; amount: number; type: 'ONE_TIME' | 'RECURRING' }> = []
    if (pricing?.oneTimeEnabled && pricing?.oneTimeFee) {
      lineItems.push({ label: `${proposal.title} - Setup`, amount: pricing.oneTimeFee, type: 'ONE_TIME' })
    }
    if (pricing?.recurringEnabled && pricing?.recurringFee) {
      lineItems.push({ label: `${proposal.title} - ${pricing.recurringFrequency === 'ANNUAL' ? 'Annual' : 'Monthly'}`, amount: pricing.recurringFee, type: 'RECURRING' })
    }
    const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0)
    // Use insert with duplicate guard — if race inserts first, swallow duplicate and return existing
    try {
      await Invoice.create({
        invoiceNumber: invoiceCode,
        accountId: proposal.accountId,
        packageId: proposal.packageId,
        proposalCode: proposal.proposalCode,
        division,
        status: 'PENDING',
        amount: totalAmount,
        currency: 'INR',
        lineItems,
        paymentSchedule: pricing?.paymentSchedule || 'FULL_UPFRONT',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      })
    } catch (e: any) {
      if (e?.code !== 11000) throw e
      // duplicate proposalCode — another concurrent accept already created invoice
    }

    // Email invoice with payment link to customer
    try {
      if (canSendMail() && account.email) {
        const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
        const hubUrl = process.env.HUB_URL || 'https://hub.nexbaron.com'
        const invoiceUrl = `${hubUrl}/${division}/proposals?proposal=${proposal.proposalCode}`
        const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
        await sendMail({
          from: process.env[`SMTP_${division.toUpperCase()}_USER`] || 'hello@nexbaron.com',
          to: account.email,
          subject: `Invoice ready — ${invoiceCode} — ${inr.format(totalAmount)}`,
          html: `
            <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
              <p style="color:#333;font-size:15px;margin:0 0 16px;">Hi ${escapeHtml(account.name || '')},</p>
              <p style="color:#333;font-size:15px;margin:0 0 16px;">Your proposal <strong>${escapeHtml(proposal.title)}</strong> has been accepted. Invoice <strong>${invoiceCode}</strong> is ready for payment.</p>
              ${lineItems.length > 0 ? `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">${lineItems.map(li => `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#333;"><span>${escapeHtml(li.label)}</span><span>${inr.format(li.amount)}</span></div>`).join('')}<div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:600;font-size:15px;"><span>Total</span><span>${inr.format(totalAmount)}</span></div></div>` : ''}
              <p style="margin:24px 0;">
                <a href="${invoiceUrl}" style="display:inline-block;padding:12px 28px;background:#14b8a6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Pay now</a>
              </p>
              <p style="color:#999;font-size:12px;margin-top:24px;">— ${brandName}</p>
            </div>`,
        })
      }
    } catch (e) {
      console.error('Failed to email invoice', e)
    }

    res.json({ success: true, proposal: proposal.toObject() })
  } catch (error) {
    return handleError('acceptProposal', req, res, error, 'Failed to accept proposal')
  }
}

export async function getInvoiceForProposal(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Proposal, Invoice } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const proposalCode = String(req.params.code)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>)
      .findOne({ proposalCode, accountId: account.accountCode, division })
      .lean()
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ proposalCode: proposal.proposalCode, accountId: account.accountCode, division })
      .lean()
    if (!invoice) {
      res.status(404).json({ success: false, message: 'No invoice found for this proposal' })
      return
    }
    const rk = process.env.RAZORPAY_KEY_ID
    const razorpayKeyId = rk && (rk.startsWith('rzp_test_') || rk.startsWith('rzp_live_')) ? rk : ''
    const summary = buildBillingView(invoice)
    res.json({ success: true, invoice, summary, razorpayKeyId })
  } catch (error) {
    return handleError('getInvoiceForProposal', req, res, error, 'Failed to load invoice')
  }
}

export async function getProposalPdf(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Proposal } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const proposalCode = String(req.params.code)
    const proposal = await (Proposal as ReturnType<typeof createProposalModel>)
      .findOne({ proposalCode, accountId: account.accountCode, division })
      .lean()
    if (!proposal) {
      res.status(404).json({ success: false, message: 'Proposal not found' })
      return
    }
    // ETag for client caching — re-render only when proposal changes
    const etag = `"${String(proposal.updatedAt || proposal.createdAt)}-${proposal.version}"`
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end()
      return
    }
    const { renderProposalPdf } = await import('../services/proposal-pdf.js')
    const pdf = await renderProposalPdf(proposal as any, account)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="proposal-${proposal.proposalCode}.pdf"`)
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'private, max-age=60')
    res.send(pdf)
  } catch (error) {
    return handleError('getProposalPdf', req, res, error, 'Failed to generate proposal PDF')
  }
}
