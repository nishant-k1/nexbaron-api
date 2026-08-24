import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { getDivisionModels } from '../../../models/registry'
import { nextCode } from '../../../utils/sequence'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { LIFECYCLE_STAGES, type LifecycleStage } from '../../../models/account.model'

export async function getMyAccount(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, User, Sequence } = getDivisionModels(division)
    let account: any = await Account.findOne({ userId, division }).lean()
    if (!account) {
      const user = await User.findById(userId).lean()
      if (!user) {
        res.status(401).json({ success: false, message: 'Account unavailable' })
        return
      }
      const accountCode = await nextCode(Sequence, `account-${division}`, 'ACC')
      try {
        const created = await Account.create({
          accountCode,
          userId: user._id.toString(),
          division,
          name: user.name,
          email: user.email,
          phone: user.phone,
          lifecycleStage: 'REGISTERED',
        })
        account = created.toObject()
      } catch (err: unknown) {
        // Race-safe under the unique (division, userId) constraint: if a
        // concurrent request already created the account, return that one.
        if ((err as { code?: number })?.code === 11000) {
          account = (await Account.findOne({ userId, division }).lean()) as unknown as Record<string, unknown>
        } else {
          throw err
        }
      }
    }
    res.json({ success: true, account })
  } catch (error) {
    return handleError('getMyAccount', req, res, error, 'Failed to load account')
  }
}

export async function listAccounts(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account } = getDivisionModels(division)
    const search = (req.query.search as string) || ''
    const stage = req.query.stage as LifecycleStage | undefined
    const filter: Record<string, unknown> = { division }
    if (stage) filter.lifecycleStage = stage
    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { name: rx },
        { email: rx },
        { phone: rx },
        { company: rx },
        { accountCode: rx },
      ]
    }
    const accounts = await Account.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ success: true, accounts })
  } catch (error) {
    return handleError('listAccounts', req, res, error, 'Failed to load accounts')
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account } = getDivisionModels(division)
    const accountCode = String(req.params.code)
    const account = await Account.findOne({ accountCode, division }).lean()
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }
    res.json({ success: true, account })
  } catch (error) {
    return handleError('getAccount', req, res, error, 'Failed to load account')
  }
}

export async function createAccount(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account, Sequence } = getDivisionModels(division)
    const { name, email, phone, company, source, userId, leadId, stage } = req.body
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Name is required' })
      return
    }
    // Enforce one Account per (division, user). Anonymous/lead placeholders
    // (no userId) are exempt; an explicit userId must not already own an account.
    if (userId) {
      const existing = await Account.findOne({ division, userId }).lean()
      if (existing) {
        res.status(409).json({
          success: false,
          message: 'Account already exists for this user',
          accountCode: (existing as { accountCode?: string }).accountCode,
        })
        return
      }
    }
    const accountCode = await nextCode(Sequence, `account-${division}`, 'ACC')
    const lifecycleStage: LifecycleStage =
      (stage as LifecycleStage) || (leadId || source ? 'LEAD' : 'REGISTERED')
    const account = await Account.create({
      accountCode,
      userId,
      leadId,
      division,
      name: name.trim(),
      email,
      phone,
      company,
      source,
      lifecycleStage,
      stageHistory: [{ stage: lifecycleStage, by: req.staffAuth.name, at: new Date() }],
    })
    res.status(201).json({ success: true, account: account.toObject() })
  } catch (error) {
    return handleError('createAccount', req, res, error, 'Failed to create account')
  }
}

export async function advanceStage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account } = getDivisionModels(division)
    const accountCode = String(req.params.code)
    const stage = req.body.stage as LifecycleStage
    if (!stage || !LIFECYCLE_STAGES.includes(stage)) {
      res.status(400).json({ success: false, message: 'Invalid lifecycle stage' })
      return
    }
    const account = await Account.findOneAndUpdate(
      { accountCode, division },
      {
        $set: { lifecycleStage: stage },
        $push: { stageHistory: { stage, by: req.staffAuth.name, at: new Date() } },
      },
      { new: true }
    )
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }
    res.json({ success: true, account: account.toObject() })
  } catch (error) {
    return handleError('advanceStage', req, res, error, 'Failed to update account stage')
  }
}

export async function updateAccount(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account } = getDivisionModels(division)
    const accountCode = String(req.params.code)
    const { name, email, phone, company, liveWebsiteUrl, liveUrls, socialLinks } = req.body
    const update: Record<string, any> = {}
    if (name !== undefined) update.name = String(name).trim()
    if (email !== undefined) update.email = String(email).trim().toLowerCase() || undefined
    if (phone !== undefined) update.phone = String(phone).trim() || undefined
    if (company !== undefined) update.company = String(company).trim() || undefined
    if (liveWebsiteUrl !== undefined) update.liveWebsiteUrl = String(liveWebsiteUrl).trim() || undefined
    if (liveUrls !== undefined) {
      if (Array.isArray(liveUrls)) {
        const urls = liveUrls
          .map((u: any) => ({
            label: String(u.label || '').trim().slice(0, 60),
            url: String(u.url || '').trim(),
          }))
          .filter((u: any) => u.label && u.url)
          .slice(0, 20)
        update.liveUrls = urls.length > 0 ? urls : undefined
      } else if (liveUrls === null) {
        update.liveUrls = undefined
      }
    }
    if (socialLinks !== undefined && typeof socialLinks === 'object' && socialLinks !== null) {
      const links: Record<string, string> = {}
      if (typeof socialLinks.instagram === 'string' && socialLinks.instagram.trim()) links.instagram = socialLinks.instagram.trim()
      if (typeof socialLinks.facebook === 'string' && socialLinks.facebook.trim()) links.facebook = socialLinks.facebook.trim()
      if (typeof socialLinks.linkedin === 'string' && socialLinks.linkedin.trim()) links.linkedin = socialLinks.linkedin.trim()
      if (typeof socialLinks.twitter === 'string' && socialLinks.twitter.trim()) links.twitter = socialLinks.twitter.trim()
      if (typeof socialLinks.website === 'string' && socialLinks.website.trim()) links.website = socialLinks.website.trim()
      update.socialLinks = Object.keys(links).length > 0 ? links : undefined
    }
    const account = await Account.findOneAndUpdate({ accountCode, division }, { $set: update }, { new: true })
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }
    res.json({ success: true, account: account.toObject() })
  } catch (error) {
    return handleError('updateAccount', req, res, error, 'Failed to update account')
  }
}
