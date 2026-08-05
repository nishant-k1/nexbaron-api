import { Request, Response } from 'express'
import { OrderStatus, PaymentMethod } from '../models/order.model'
import { getDivisionModels } from '../../../models/registry'

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
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
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
  } catch {
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
      })
    }

    // Record the payment and recompute totals/status.
    order.payments.push({
      method,
      amount,
      reference: body.reference?.trim() || undefined,
      receivedAt: new Date(),
      recordedBy: req.staffAuth?.name,
    })
    order.amountPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
    order.status = order.amountPaid >= order.amount ? 'paid' : 'pending'
    await order.save()

    // The lead is now a paying customer.
    if (lead.status !== 'won') {
      lead.status = 'won'
      lead.statusHistory.push({ status: 'won', at: new Date() })
      await lead.save()
    }

    res.json({ success: true, order, lead })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to record payment' })
  }
}

/** Admin-only: update an order's status. */
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const status = req.body?.status as OrderStatus
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid order status' })
      return
    }
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
    order.status = status
    await order.save()
    res.json({ success: true, order })
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update order' })
  }
}