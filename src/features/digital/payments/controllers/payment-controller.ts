import { Request, Response } from 'express'
import { Types } from 'mongoose'

import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'
import { IOrder } from '../../../../orders/models/order.model'
import {
  emailInvoice,
  createRazorpayOrder,
  nextInvoiceNumber,
  RAZORPAY_KEY_ID,
  razorpayConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../services/razorpay'
import { buildLaunchStages, computeOrder, SelectionsInput } from '../services/pricing'
import { runtimeBrand } from '../../../../utils/runtime-brand'

// Client-driven: create a checkout order and return the Razorpay order id.
export async function createCheckout(req: Request, res: Response) {
  try {
    if (!ifAuthenticated(req, res)) return

    const body = (req.body ?? {}) as Record<string, unknown>
    const planId = String(body.planId ?? '')
    const customer = (body.customer ?? {}) as Record<string, string>
    const selections = (body.selections ?? {}) as SelectionsInput

    const computed = computeOrder({ planId, plans: selections.plans ?? {} })
    if (computed.amount <= 0) {
      res.status(400).json({ success: false, message: 'Nothing to charge' })
      return
    }

    const { Order, Lead, InvoiceCounter, User } = getDivisionModels(req.division!)
    const user = await User.findOne({ _id: req.userId, division: req.division })
    if (!user) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }

    const customerName = user.name
    const customerEmail = user.email || customer.email
    const customerPhone = user.phone || customer.phone
    if (!customerEmail && !customerPhone) {
      res.status(400).json({ success: false, message: 'A verified email or phone number is required' })
      return
    }

    // Create/upsert a pending lead; successful payment moves it to won.
    const lead = await Lead.findOneAndUpdate(
      {
        division: req.division,
        ...(customerEmail ? { email: customerEmail } : { phone: customerPhone }),
      },
      {
        $set: {
          division: req.division,
          source: 'checkout',
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          company: customer.company,
          city: customer.city,
          plan: planId,
          subject: customer.services,
          message: customer.notes,
        },
        $setOnInsert: { status: 'new' },
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )

    const invoiceNumber = await nextInvoiceNumber(InvoiceCounter)
    const razorpay = await createRazorpayOrder(computed.amount * 100, `NXB${Date.now()}`, {
      plan: planId,
      customer: customer.name || '',
    })

    const milestones = buildLaunchStages(computed.launchDays).map((m) => {
      const date = new Date(new Date(computed.launchDate).getTime())
      date.setDate(date.getDate() - (computed.launchDays - m.endDay))
      return {
        key: m.key,
        label: m.label,
        dayLabel: m.dayLabel,
        date,
        status: 'pending' as const,
      }
    })

    const order = await Order.create({
      userId: req.userId ? new Types.ObjectId(req.userId) : undefined,
      leadId: lead._id,
      division: req.division,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        company: customer.company,
        city: customer.city,
      },
      service: planId,
      amount: computed.amount,
      items: computed.items,
      status: 'pending',
      amountPaid: 0,
      launchDate: computed.launchDate,
      launchDays: computed.launchDays,
      milestones,
      invoiceNumber,
      razorpay: { orderId: razorpay.id },
      billing: { address: customer.address },
      notes: customer.notes,
    })

    res.json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpay.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      devMode: !razorpayConfigured(),
      amount: computed.amount,
      launchDate: computed.launchDate,
      launchDays: computed.launchDays,
      timelineMode: computed.timelineMode,
      milestones,
      invoiceNumber,
    })
  } catch (error) {
    logger.error('createCheckout failed', error)
    res.status(500).json({ success: false, message: 'Could not start checkout' })
  }
}

// Customer dashboard: return the customer's most recent (paid or in-progress)
// order so the site can show their real launch tracker.
export async function myOrder(req: Request, res: Response) {
  try {
    if (!ifAuthenticated(req, res)) return
    const { Order } = getDivisionModels(req.division!)
    const order = await Order.findOne({
      userId: req.userId ? new Types.ObjectId(req.userId) : undefined,
      division: req.division,
      status: { $ne: 'cancelled' },
    })
      .sort({ createdAt: -1 })
      .lean()
    if (!order) {
      res.json({ success: true, order: null })
      return
    }
    res.json({
      success: true,
      order: {
        orderId: order._id,
        invoiceNumber: order.invoiceNumber || '',
        plan: order.service || '',
        status: order.status,
        amount: order.amount,
        amountPaid: order.amountPaid,
        launchDate: order.launchDate ?? null,
        launchDays: order.launchDays ?? null,
        milestones: order.milestones ?? [],
        createdAt: order.createdAt,
      },
    })
  } catch (error) {
    logger.error('myOrder failed', error)
    res.status(500).json({ success: false, message: 'Could not load your order' })
  }
}

// Client-driven: verify Razorpay signature after the Checkout modal succeeds.
export async function verifyPayment(req: Request, res: Response) {
  try {
    if (!req.userId || !Types.ObjectId.isValid(req.userId)) {
      res.status(401).json({ success: false, message: 'Invalid authentication subject' })
      return
    }
    const body = req.body as {
      razorpay_order_id?: string
      razorpay_payment_id?: string
      razorpay_signature?: string
    }
    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      res.status(400).json({ success: false, message: 'Missing payment references' })
      return
    }
    // In dev fallback mode (dummy keys) skip the live signature check so the
    // flow can be exercised end-to-end. Production always verifies.
    if (!razorpayConfigured() && process.env.NODE_ENV === 'production') {
      res.status(503).json({ success: false, message: 'Payments are not configured' })
      return
    }
    if (razorpayConfigured() && !verifyPaymentSignature(body as Required<typeof body>)) {
      res.status(400).json({ success: false, message: 'Invalid payment signature' })
      return
    }

    const { Order } = getDivisionModels(req.division!)
    const order = await Order.findOne({
      'razorpay.orderId': body.razorpay_order_id,
      userId: new Types.ObjectId(req.userId!),
      division: runtimeBrand,
    })
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' })
      return
    }

    await finalizeOrder(order, { method: 'razorpay', paymentId: body.razorpay_payment_id, signature: body.razorpay_signature })

    res.json({
      success: true,
      orderId: order._id,
      invoiceNumber: order.invoiceNumber,
      launchDate: order.launchDate,
      milestones: order.milestones,
    })
  } catch (error) {
    logger.error('verifyPayment failed', error)
    res.status(500).json({ success: false, message: 'Could not verify payment' })
  }
}

// Server-side webhook (safety net, typically `payment.captured`).
// Mounted with express.raw so `req.body` is a Buffer holding the exact payload.
export async function razorpayWebhook(req: Request, res: Response) {
  const raw = (req.body ?? Buffer.alloc(0)) as Buffer
  const rawString = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)
  try {
    const signature = req.header('x-razorpay-signature') || ''
    if (!verifyWebhookSignature(rawString, signature)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' })
      return
    }
    const event = (typeof rawString === 'string' ? JSON.parse(rawString) : {}) as {
      event?: string
      payload?: { payment?: { entity?: { order_id?: string; id?: string } } }
    }
    if (event.event !== 'payment.captured') {
      res.json({ success: true })
      return
    }
    const entity = event.payload?.payment?.entity
    const orderId = entity?.order_id
    if (!orderId) {
      res.json({ success: true })
      return
    }

    const { Order } = getDivisionModels(runtimeBrand)
    const order = await Order.findOne({ 'razorpay.orderId': orderId, division: runtimeBrand })
    const captured = Boolean(order)
    if (order) await finalizeOrder(order, { method: 'razorpay', paymentId: entity?.id })
    if (!captured) logger.warn('Webhook for unknown order', orderId)
    res.json({ success: true })
  } catch (error) {
    logger.error('razorpayWebhook failed', error)
    res.status(500).json({ success: false, message: 'Webhook error' })
  }
}

async function finalizeOrder(order: IOrder, payment: { method: 'razorpay'; paymentId?: string; signature?: string }) {
  if (order.status === 'paid') return
  order.amountPaid = order.amount
  order.status = 'paid'
  order.payments.push({
    method: payment.method,
    amount: order.amount,
    receivedAt: new Date(),
    reference: payment.paymentId,
  })
  order.razorpay = {
    orderId: order.razorpay?.orderId,
    paymentId: payment.paymentId,
    signature: payment.signature,
  }
  await order.save()
  const { Lead } = getDivisionModels(runtimeBrand)
  if (order.leadId) await Lead.updateOne({ _id: order.leadId }, { $set: { status: 'won' } })
  await emailInvoice(order, order.invoiceNumber || '')
}

function ifAuthenticated(req: Request, res: Response): boolean {
  if (!req.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return false
  }
  return true
}
