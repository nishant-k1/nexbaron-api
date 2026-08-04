import { Request, Response } from 'express'
import { Lead, LeadStatus } from '../../../models/lead.model'

const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'dormant']

/**
 * Public endpoint — stores contact-form submissions as leads.
 * Accepts both digital (plan/businessType/city/goal) and print
 * (company/requirement/quantity/deadline/deliveryPincode) field sets.
 */
export async function submitLead(req: Request, res: Response) {
  try {
    const body = req.body ?? {}
    const division: 'digital' | 'print' = body.division === 'print' ? 'print' : 'digital'
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

    const lead = await Lead.create({
      division,
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
    })

    res.status(201).json({ success: true, leadId: lead._id })
  } catch (error) {
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
    const division = req.query.division
    const status = req.query.status
    const assigned = req.query.assigned
    const search = (req.query.search as string) || ''

    const filter: Record<string, unknown> = {}
    if (division === 'digital' || division === 'print') filter.division = division
    if (VALID_STATUSES.includes(status as LeadStatus)) filter.status = status
    if (assigned === 'mine') filter.assignedStaff = req.staffAuth?.name
    if (assigned === 'unassigned') filter.assignedStaff = null
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }]
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ success: true, leads })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to load leads' })
  }
}