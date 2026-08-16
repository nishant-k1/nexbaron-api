import { OrderStatus, PaymentMethod } from '../../../models/order.model'
import { getDivisionModels } from '../../../models/registry'
import { escapeRegex } from '../../../utils/regex'

const VALID_STATUSES: OrderStatus[] = ['pending', 'paid', 'in_progress', 'delivered', 'cancelled']
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['razorpay', 'upi', 'bank', 'cash', 'other']

export async function findOrders(division: 'digital' | 'print', filters: { status?: string; search?: string }) {
  const { Order } = getDivisionModels(division)
  const query: Record<string, unknown> = { division }
  if (filters.status && VALID_STATUSES.includes(filters.status as OrderStatus)) {
    query.status = filters.status
  }
  if (filters.search) {
    const rx = new RegExp(escapeRegex(filters.search), 'i')
    query.$or = [
      { 'customer.name': rx },
      { 'customer.email': rx },
      { 'customer.phone': rx },
      { 'customer.company': rx },
      { invoiceNumber: rx },
    ]
  }
  return Order.find(query).sort({ createdAt: -1 }).limit(500).lean()
}

export async function findOrCreateOrderFromLead(
  lead: any,
  body: { service?: string; amount: number; method: PaymentMethod; reference?: string },
  staffName: string
) {
  const { Order } = getDivisionModels(lead.division)

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
      amount: body.amount,
      currency: 'INR',
      payments: [],
      amountPaid: 0,
      stageHistory: [{ stage: 'pending', by: staffName, at: new Date() }],
    })
  }

  const previousStatus = order.status
  order.payments.push({
    method: body.method,
    amount: body.amount,
    reference: body.reference?.trim() || undefined,
    receivedAt: new Date(),
    recordedBy: staffName,
  })
  order.amountPaid = order.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
  order.status = order.amountPaid >= order.amount ? 'paid' : 'pending'
  if (order.status !== previousStatus) {
    order.stageHistory.push({ stage: order.status, by: staffName, at: new Date() })
  }
  await order.save()

  return { order, previousStatus }
}

export { VALID_STATUSES, VALID_PAYMENT_METHODS }
