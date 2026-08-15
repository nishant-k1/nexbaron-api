import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { randomUUID } from 'crypto'

import { PLAN_CATALOG } from '../../catalog/service-package-pricing-catalog'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'
import { IOrder } from '../../../../models/order.model'
import { stringParam } from '../../../../utils/route-param'
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
import { escapeHtml, logoNx, NX_DIGITAL, NX_PRINT } from '../../../../utils/html'
import { requireAuthenticated } from '../../../../middleware/require-authenticated'

// Client-driven: create a checkout order and return the Razorpay order id.
export async function createCheckout(req: Request, res: Response) {
  try {
    if (!requireAuthenticated(req, res)) return

    const body = (req.body ?? {}) as Record<string, unknown>
    const planId = String(body.planId ?? '')
    const billingCycle = body.billingCycle === 'annual' ? 'annual' : 'monthly'
    const customer = (body.customer ?? {}) as Record<string, string>
    const selections = (body.selections ?? {}) as SelectionsInput

    const computed = computeOrder({ planId, plans: selections.plans ?? {} }, billingCycle)
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
    const projectId = randomUUID()
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
        $setOnInsert: { status: 'new', projectId },
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )

    if (!lead.projectId) {
      lead.projectId = projectId
      await lead.save()
    }

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
      projectId: lead.projectId,
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
      billingCycle: computed.billingCycle,
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
      stageHistory: [{ stage: 'pending', by: 'system', at: new Date() }],
    })

    res.status(201).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: razorpay.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      devMode: !razorpayConfigured(),
      billingCycle: computed.billingCycle,
      amount: computed.amount,
      setupTotal: computed.setupTotal,
      monthlyTotal: computed.monthlyTotal,
      annualTotal: computed.annualTotal,
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
    if (!requireAuthenticated(req, res)) return
    const { Order } = getDivisionModels(req.division!)
    const orders = await Order.find({
      userId: req.userId ? new Types.ObjectId(req.userId) : undefined,
      division: req.division,
      status: { $ne: 'cancelled' },
    })
      .sort({ createdAt: -1 })
      .lean()
    if (!orders || orders.length === 0) {
      res.json({ success: true, orders: [] })
      return
    }
    res.json({
      success: true,
      orders: orders.map((order) => {
        // Compute progress from plan catalog
        const plan = PLAN_CATALOG.plans.find((p) => p.id === order.service)
        const steps: { label: string; done: boolean }[] = [
          { label: 'Package chosen', done: true },
          { label: 'Payment completed', done: order.status === 'paid' || order.status === 'in_progress' || order.status === 'delivered' },
        ]
        if (plan) {
          for (const s of plan.services) steps.push({ label: s.label, done: order.status === 'delivered' })
        }
        const doneCount = steps.filter((s) => s.done).length

        return {
        orderId: order._id,
        invoiceNumber: order.invoiceNumber || '',
        plan: order.service || '',
        planName: plan?.name || order.service || '',
        billingCycle: order.billingCycle || 'monthly',
        status: order.status,
        amount: order.amount,
        amountPaid: order.amountPaid,
        payments: order.payments || [],
        launchDate: order.launchDate ?? null,
        launchDays: order.launchDays ?? null,
        milestones: order.milestones ?? [],
        progress: { steps, percentage: steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0 },
        createdAt: order.createdAt,
      }}),
    })
  } catch (error) {
    logger.error('myOrder failed', error)
    res.status(500).json({ success: false, message: 'Could not load your order' })
  }
}

// Download invoice receipt for a specific order
export async function downloadReceipt(req: Request, res: Response) {
  try {
    const orderId = stringParam(req, 'orderId')
    if (!req.userId || !Types.ObjectId.isValid(req.userId) || !orderId || !Types.ObjectId.isValid(orderId)) {
      res.status(400).json({ success: false, message: 'Invalid order id' })
      return
    }
    const { Order } = getDivisionModels(req.division!)
    const order = await Order.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(req.userId),
      division: req.division,
    }).lean()

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' })
      return
    }

    const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const amount = (order.amount || 0).toLocaleString('en-IN')
    const invoice = escapeHtml(order.invoiceNumber || order._id.toString().slice(-8).toUpperCase())
    const brand = req.division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
    const colors = req.division === 'digital' ? NX_DIGITAL : NX_PRINT
    const accent = colors.stop1
    const status = escapeHtml(order.status || '')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${invoice}</title>
<style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#0f172a;padding:0 16px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:24px}
.header h1{font-size:20px;margin:0}.header p{font-size:12px;color:#64748b;margin:2px 0}
.brand{display:flex;align-items:center;gap:12px}
.meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:24px}
.meta strong{color:#64748b}
.table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px}
.table th{text-align:left;padding:10px 8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase}
.table td{padding:10px 8px;border-bottom:1px solid #f1f5f9}
.total{text-align:right;font-size:18px;font-weight:bold}
.footer{font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px}
</style></head><body>
<div class="header">
  <div class="brand">
    ${logoNx(colors)}
    <div><h1>${brand}</h1><p>Payment Receipt</p></div>
  </div>
  <div style="text-align:right"><p><strong>Receipt #</strong> ${invoice}</p><p>${date}</p></div>
</div>
<div class="meta">
  <div><strong>Customer</strong><br>${escapeHtml(order.customer?.name || '—')}<br>${escapeHtml(order.customer?.email || '')}<br>${escapeHtml(order.customer?.phone || '')}</div>
  <div style="text-align:right"><strong>Status</strong><br><span style="color:${accent}">${status}</span></div>
</div>
<table class="table">
  <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
  <tr><td>${escapeHtml(order.service || 'Website Plan')}</td><td style="text-align:right">₹${amount}</td></tr>
  ${(order.payments || []).map((p: any) => `<tr><td style="color:#64748b;font-size:11px">Payment · ${escapeHtml(p.method || 'upi')} · ${new Date(p.receivedAt).toLocaleDateString('en-IN')}</td><td style="text-align:right;color:#64748b">-₹${(p.amount || 0).toLocaleString('en-IN')}</td></tr>`).join('')}
  <tr><td colspan="2" style="border-top:2px solid #e2e8f0"><div class="total">Balance: ₹${((order.amount || 0) - (order.amountPaid || 0)).toLocaleString('en-IN')}</div></td></tr>
</table>
<div class="footer">${brand} · nexbaron.com · This is a computer-generated receipt.</div>
</body></html>`

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `inline; filename="receipt-${invoice}.html"`)
    res.send(html)
  } catch (error) {
    logger.error('downloadReceipt failed', error)
    res.status(500).json({ success: false, message: 'Failed to generate receipt' })
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
  order.stageHistory.push({ stage: 'paid', by: 'system', at: new Date() })
  if (order.milestones && order.milestones.length > 0) {
    const ms = order.milestones
    if (ms[0]) ms[0].status = 'done'
    if (ms[1]) ms[1].status = 'done'
    order.markModified('milestones')
  }
  // Default onboarding checklist for digital orders
  if (!order.onboardingChecklist || order.onboardingChecklist.length === 0) {
    order.onboardingChecklist = [
      { item: 'Logo received', done: false },
      { item: 'Content / text received', done: false },
      { item: 'Photos / images received', done: false },
      { item: 'Business details confirmed', done: false },
      { item: 'Domain access received', done: false },
    ]
  }
  await order.save()
  const { Lead } = getDivisionModels(runtimeBrand)
  if (order.leadId) await Lead.updateOne({ _id: order.leadId }, { $set: { status: 'won' } })
  await emailInvoice(order, order.invoiceNumber || '')
}
