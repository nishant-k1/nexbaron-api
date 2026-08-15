import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { LeadStatus } from '../../../models/lead.model'
import { getDivisionModels } from '../../../models/registry'
import { logger } from '../../../utils/logger'
import { escapeRegex } from '../../../utils/regex'
import { runtimeBrand } from '../../../utils/runtime-brand'
import { getNextStaffForAssignment } from '../services/auto-assign'
import { sendLeadAcknowledgment } from '../services/acknowledge'

const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified', 'proposal', 'won', 'lost', 'dormant']

/**
 * Public endpoint — stores contact-form submissions as leads.
 * Accepts both digital (plan/businessType/city/goal) and print
 * (company/requirement/quantity/deadline/deliveryPincode) field sets.
 */
export async function submitLead(req: Request, res: Response) {
  try {
    const body = req.body ?? {}
    const division = runtimeBrand
    const name = (body.name || '').trim()

    if (!name || name.length < 2) {
      res.status(400).json({ success: false, message: 'Please provide a valid name' })
      return
    }
    if (!body.message || body.message.trim().length < 3) {
      res.status(400).json({ success: false, message: 'Please provide a short message' })
      return
    }

    const clientRef = deriveClientRef({ email: body.email, phone: body.phone })

    const { Lead } = getDivisionModels(division)

    const lead = await Lead.create({
      division,
      projectId: randomUUID(),
      source: (body.source || 'web').toString().trim().slice(0, 40),
      name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      city: body.city,
      subject: body.subject,
      message: body.message,
      plan: body.plan,
      businessType: body.businessType,
      goal: body.goal,
      requirement: body.requirement,
      quantity: body.quantity,
      deadline: body.deadline,
      deliveryPincode: body.deliveryPincode,
      clientRef,
      referredBy: body.referredBy?.name
        ? { name: String(body.referredBy.name).trim().slice(0, 100), email: body.referredBy.email?.trim() || undefined, projectId: body.referredBy.projectId || undefined }
        : undefined,
    })

    void sendLeadAcknowledgment(lead)
    void autoAssignLeadAfterCreate(lead)

    res.status(201).json({ success: true, leadId: lead._id })
  } catch (error) {
    logger.error('submitLead failed', error)
    res.status(500).json({ success: false, message: 'Failed to save lead' })
  }
}

function deriveClientRef(input: { email?: string; phone?: string }): string | undefined {
  if (input.email) return `email:${input.email.trim().toLowerCase()}`
  if (input.phone) return `phone:${input.phone.trim()}`
  return undefined
}

/** Admin-only: list leads with optional filters. */
export async function listLeads(req: Request, res: Response) {
  try {
    const status = req.query.status
    const assigned = req.query.assigned
    const search = (req.query.search as string) || ''

    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Lead } = getDivisionModels(req.staffAuth.division)
    const filter: Record<string, unknown> = { division: req.staffAuth.division }
    if (VALID_STATUSES.includes(status as LeadStatus)) filter.status = status
    if (assigned === 'mine') filter.assignedStaff = req.staffAuth.name
    if (assigned === 'unassigned') filter.assignedStaff = null
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }]
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ success: true, leads })
  } catch (error) {
    logger.error('listLeads failed', error)
    res.status(500).json({ success: false, message: 'Failed to load leads' })
  }
}


/** Admin-only: create a lead manually (CRM "New Lead" form). */
export async function createLead(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const body = req.body ?? {}
    const name = (body.name || '').trim()
    if (!name || name.length < 2) {
      res.status(400).json({ success: false, message: 'Please provide a valid name' })
      return
    }
    const { Lead } = getDivisionModels(division)
    const lead = await Lead.create({
      division,
      projectId: randomUUID(),
      source: (body.source || 'manual').toString().trim().slice(0, 40),
      name,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      company: body.company?.trim() || undefined,
      city: body.city?.trim() || undefined,
      subject: body.subject?.trim() || undefined,
      message: body.message?.trim() || undefined,
      plan: body.plan?.trim() || undefined,
      clientRef: deriveClientRef({ email: body.email, phone: body.phone }),
      referredBy: body.referredBy?.name
        ? { name: String(body.referredBy.name).trim().slice(0, 100), email: body.referredBy.email?.trim() || undefined, projectId: body.referredBy.projectId || undefined }
        : undefined,
    })
    res.status(201).json({ success: true, lead })
  } catch (error) {
    logger.error('createLead failed', error)
    res.status(500).json({ success: false, message: 'Failed to create lead' })
  }
}

/**
 * Admin-only — update lead status.
 */
export async function updateLeadStatus(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Lead } = getDivisionModels(division)
    const { status, rejectionReason, budget, hasDomain, timeline, competitorInfo } = req.body
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'Valid status required' })
      return
    }
    const updateFields: Record<string, unknown> = { status }
    if (rejectionReason !== undefined) updateFields.rejectionReason = String(rejectionReason).slice(0, 500)
    if (budget !== undefined) updateFields.budget = String(budget).slice(0, 200)
    if (hasDomain !== undefined) updateFields.hasDomain = Boolean(hasDomain)
    if (timeline !== undefined) updateFields.timeline = String(timeline).slice(0, 200)
    if (competitorInfo !== undefined) updateFields.competitorInfo = String(competitorInfo).slice(0, 500)
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, division },
      {
        $set: updateFields,
        $push: { statusHistory: { status: status as LeadStatus, by: req.staffAuth.name, at: new Date() } },
      },
      { new: true }
    )
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' })
      return
    }
    res.json({ success: true, lead: { _id: lead._id, status: lead.status, statusHistory: lead.statusHistory } })
  } catch (error) {
    logger.error('updateLeadStatus failed', error)
    res.status(500).json({ success: false, message: 'Failed to update lead' })
  }
}

async function autoAssignLeadAfterCreate(lead: { _id: any; division: string; assignedStaff?: string }) {
  if (lead.assignedStaff) return
  try {
    const staffName = await getNextStaffForAssignment(lead.division)
    if (!staffName) return
    const { Lead } = getDivisionModels(lead.division as 'digital' | 'print')
    await Lead.updateOne({ _id: lead._id }, { $set: { assignedStaff: staffName } })
    logger.info(`Lead ${lead._id} auto-assigned to ${staffName}`)
  } catch (error) {
    logger.error('autoAssignLeadAfterCreate failed', error)
  }
}
