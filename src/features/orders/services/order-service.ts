import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order.model'
import { getDivisionModels } from '../../../models/registry'
import { escapeRegex } from '../../../utils/regex'

const VALID_STATUSES: OrderStatus[] = ['active', 'cancelled']
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['razorpay', 'upi', 'bank', 'cash', 'other']

function computePaymentStatus(amountPaid: number, setupTotal: number): PaymentStatus {
  if (setupTotal <= 0) return 'fully_paid'
  if (amountPaid <= 0) return 'unpaid'
  if (amountPaid >= setupTotal) return 'fully_paid'
  return 'partially_paid'
}

function getSetupTotal(items: any[]): number {
  return (items || [])
    .filter((i: any) => i.billingCycle === 'setup')
    .reduce((sum: number, i: any) => sum + (i.price || 0) * (i.quantity || 1), 0)
}

function getPlanLabel(serviceId?: string): string | undefined {
  if (!serviceId) return undefined
  // Lazy-load catalog to avoid circular deps
  try {
    const plans = require('../../../features/digital/catalog/plans/v1/plans-type').default
    const plan = plans[serviceId]
    return plan?.name || serviceId
  } catch {
    return serviceId
  }
}

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
  const results = await Order.find(query).sort({ createdAt: -1 }).limit(500).lean()
  for (const doc of results) {
    if (!doc.paymentStatus) {
      const setupTotal = getSetupTotal(doc.items)
      doc.paymentStatus = computePaymentStatus(doc.amountPaid || 0, setupTotal)
    }
  }
  return results
}

export async function findOrCreateOrderFromLead(
  lead: any,
  body: { service?: string; amount: number; method: PaymentMethod; reference?: string },
  staffName: string
) {
  const { Order } = getDivisionModels(lead.division)

  let order = await Order.findOne({ leadId: lead._id, status: 'active' }).sort({ createdAt: -1 })

  if (!order) {
    const serviceId = body.service || lead.plan || lead.requirement || undefined
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
      service: serviceId,
      planLabel: getPlanLabel(serviceId),
      amount: body.amount,
      currency: 'INR',
      payments: [],
      amountPaid: 0,
      stageHistory: [{ stage: 'active', by: staffName, at: new Date() }],
    })
  }

  order.payments.push({
    method: body.method,
    amount: body.amount,
    reference: body.reference?.trim() || undefined,
    receivedAt: new Date(),
    recordedBy: staffName,
  })
  order.amountPaid = order.payments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const setupTotal = getSetupTotal(order.items)
  order.paymentStatus = computePaymentStatus(order.amountPaid, setupTotal)
  order.status = 'active'
  await order.save()

  return { order, previousStatus: 'active' as OrderStatus }
}

export { VALID_STATUSES, VALID_PAYMENT_METHODS }
