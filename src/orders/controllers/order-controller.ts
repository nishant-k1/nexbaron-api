import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { OrderStatus, PaymentMethod } from '../models/order.model'
import { getDivisionModels } from '../../models/registry'
import { logger } from '../../utils/logger'
import { escapeRegex } from '../../utils/regex'

const VALID_STATUSES: OrderStatus[] = ['pending', 'paid', 'in_progress', 'delivered', 'cancelled']
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['razorpay', 'upi', 'bank', 'cash', 'other']

/** Admin-only: list customers (orders) with filters. */
export async function listOrders(req: Request, res: Response) {
  try {
    const status = req.query.status
    const search = (req.query.search as string) || ''

    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Order } = getDivisionModels(req.staffAuth.division)
    const filter: Record<string, unknown> = { division: req.staffAuth.division }
    if (VALID_STATUSES.includes(status as OrderStatus)) filter.status = status
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { 'customer.name': rx },
        { 'customer.email': rx },
        { 'customer.phone': rx },
        { 'customer.company': rx },
        { invoiceNumber: rx },
      ]
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ success: true, orders })
  } catch (error) {
    logger.error('listOrders failed', error)
    res.status(500).json({ success: false, message: 'Failed to load customers' })
  }
}

interface RecordPaymentBody {
  leadId: string
  amount: number
  method: PaymentMethod
  reference?: string
  service?: string
}

/**
 * Converts a lead into a customer by recording the first payment.
 * Sets the order to `paid` and the lead to `won`.
 */
export async function recordPaymentFromLead(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as RecordPaymentBody
    const leadId = (body.leadId || '').trim()
    const amount = Number(body.amount)

    if (!leadId || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'A leadId and a positive amount are required' })
      return
    }
    const method: PaymentMethod = VALID_PAYMENT_METHODS.includes(body.method) ? body.method : 'other'

    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Order, Lead } = getDivisionModels(req.staffAuth.division)

    const lead = await Lead.findById(leadId)
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' })
      return
    }
    if (lead.division !== req.staffAuth.division) {
      res.status(403).json({ success: false, message: 'Not authorized for this lead' })
      return
    }

    // One active order per lead — reuse or create.
    let order = await Order.findOne({ leadId: lead._id, status: { $ne: 'cancelled' } })

    if (!order) {
      order = await Order.create({
        projectId: lead.projectId,
        leadId: lead._id,
        division: lead.division,
        customer: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          city: lead.city,
        },
        service: body.service || lead.plan || lead.requirement || undefined,
        amount,
        currency: 'INR',
        payments: [],
        amountPaid: 0,
        stageHistory: [{ stage: 'pending', by: req.staffAuth?.name || 'system', at: new Date() }],
      })
    }

    // Record the payment and recompute totals/status.
    const previousStatus = order.status
    order.payments.push({
      method,
      amount,
      reference: body.reference?.trim() || undefined,
      receivedAt: new Date(),
      recordedBy: req.staffAuth?.name,
    })
    order.amountPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
    order.status = order.amountPaid >= order.amount ? 'paid' : 'pending'
    if (order.status !== previousStatus) {
      order.stageHistory.push({ stage: order.status, by: req.staffAuth?.name || 'system', at: new Date() })
    }
    await order.save()

    // The lead is now a paying customer.
    if (lead.status !== 'won') {
      lead.status = 'won'
      lead.statusHistory.push({ status: 'won', by: req.staffAuth?.name, at: new Date() })
      await lead.save()
    }

    res.json({ success: true, order, lead })
  } catch (error) {
    logger.error('recordPaymentFromLead failed', error)
    res.status(500).json({ success: false, message: 'Failed to record payment' })
  }
}

/** Admin-only: update order status, project fields, onboarding, revisions. */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const body = (req.body ?? {}) as Record<string, any>

    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Order } = getDivisionModels(req.staffAuth.division)
    const order = await Order.findById(req.params.id)
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' })
      return
    }
    if (order.division !== req.staffAuth.division) {
      res.status(403).json({ success: false, message: 'Not authorized for this order' })
      return
    }

    const previousStatus = order.status
    if (typeof body.status === 'string' && VALID_STATUSES.includes(body.status as OrderStatus)) {
      const nextStatus = body.status as OrderStatus
      order.status = nextStatus
      if (nextStatus !== previousStatus) {
        order.stageHistory.push({ stage: nextStatus, by: req.staffAuth.name, at: new Date() })
        // Auto-schedule follow-up + review request when project completes
        if (nextStatus === 'delivered' && !order.followUpDate) {
          const followUp = new Date()
          followUp.setMonth(followUp.getMonth() + 3)
          order.followUpDate = followUp
          order.followUpType = 'checkin'
        }
        if (nextStatus === 'delivered' && !order.reviewRequestedAt) {
          order.reviewRequestedAt = new Date()
          order.reviewReceived = false
        }
      }
    }

    if (typeof body.followUpDate === 'string') order.followUpDate = new Date(body.followUpDate)
    if (typeof body.followUpType === 'string' && ['review', 'upsell', 'referral', 'checkin'].includes(body.followUpType)) {
      order.followUpType = body.followUpType as 'review' | 'upsell' | 'referral' | 'checkin'
    }

    if (typeof body.reviewRequestedAt === 'string') order.reviewRequestedAt = new Date(body.reviewRequestedAt)
    if (typeof body.reviewReceived === 'boolean') order.reviewReceived = body.reviewReceived
    if (typeof body.reviewRating === 'number') order.reviewRating = Math.min(5, Math.max(1, Math.floor(body.reviewRating)))
    if (typeof body.reviewUrl === 'string') order.reviewUrl = body.reviewUrl.trim() || undefined

    if (typeof body.assignedTeamMember === 'string') {
      order.assignedTeamMember = body.assignedTeamMember.trim() || undefined
    }

    if (typeof body.stagingUrl === 'string') {
      order.stagingUrl = body.stagingUrl.trim() || undefined
    }

    if (typeof body.paymentTerms === 'string') {
      order.paymentTerms = body.paymentTerms.trim() || undefined
    }

    if (typeof body.notes === 'string') {
      order.notes = body.notes.trim() || undefined
    }

    if (Array.isArray(body.onboardingChecklist)) {
      order.onboardingChecklist = body.onboardingChecklist.map((item: any) => ({
        item: String(item.item || ''),
        done: Boolean(item.done),
        note: item.note ? String(item.note).slice(0, 500) : undefined,
      }))
      order.markModified('onboardingChecklist')
    }

    if (body.revisions && (typeof body.revisions.used === 'number' || typeof body.revisions.max === 'number')) {
      if (typeof body.revisions.used === 'number') order.revisions.used = Math.max(0, Math.floor(body.revisions.used))
      if (typeof body.revisions.max === 'number') order.revisions.max = Math.max(1, Math.floor(body.revisions.max))
      if (typeof body.revisions.feedback === 'string' && body.revisions.feedback.trim()) {
        order.revisions.feedback.push({
          text: body.revisions.feedback.trim(),
          by: req.staffAuth.name,
          at: new Date(),
        })
      }
      order.markModified('revisions')
    }

    if (body.googleBusinessProfile) {
      if (typeof body.googleBusinessProfile.created === 'boolean') order.googleBusinessProfile!.created = body.googleBusinessProfile.created
      if (typeof body.googleBusinessProfile.verified === 'boolean') order.googleBusinessProfile!.verified = body.googleBusinessProfile.verified
      order.markModified('googleBusinessProfile')
    }

    await order.save()
    res.json({ success: true, order })
  } catch (error) {
    logger.error('updateOrderStatus failed', error)
    res.status(500).json({ success: false, message: 'Failed to update order' })
  }
}

/**
 * Repeat business — create a new project directly from an existing client,
 * skipping the lead pipeline entirely since they are already known.
 */
export async function createProjectFromClient(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { Order, Lead } = getDivisionModels(req.staffAuth.division)
    const leadId = String(body.leadId || '').trim()
    const email = String(body.email || '').trim().toLowerCase()

    let lead
    if (leadId) {
      lead = await Lead.findById(leadId).lean()
    } else if (email) {
      lead = await Lead.findOne({ division: req.staffAuth.division, email }).sort({ createdAt: -1 }).lean()
    }

    if (!lead) {
      res.status(404).json({ success: false, message: 'Existing customer not found. Provide a valid leadId or email.' })
      return
    }

    const projectId = randomUUID()
    const order = await Order.create({
      projectId,
      leadId: lead._id,
      division: req.staffAuth.division,
      customer: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        city: lead.city,
      },
      service: body.service || lead.plan || undefined,
      amount: Number(body.amount) || 0,
      currency: body.currency || 'INR',
      status: body.status || 'pending',
      items: Array.isArray(body.items) ? body.items : [],
      notes: body.notes?.trim() || undefined,
      stageHistory: [{ stage: body.status || 'pending', by: req.staffAuth.name, at: new Date() }],
      assignedTeamMember: body.assignedTeamMember?.trim() || undefined,
      paymentTerms: body.paymentTerms?.trim() || undefined,
    })

    res.status(201).json({ success: true, order })
  } catch (error) {
    logger.error('createProjectFromClient failed', error)
    res.status(500).json({ success: false, message: 'Failed to create project' })
  }
}