import crypto from 'crypto'
import { Model } from 'mongoose'

import { logger } from '../../../../utils/logger'
import { IOrder } from '../../../orders/models/order.model'

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const INVOICE_FROM = process.env.INVOICE_FROM_EMAIL || 'billing@nexbaron.com'
const BILLING_GSTIN = process.env.BILLING_GSTIN || 'BILLING_GSTIN_PLACEHOLDER'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export function razorpayConfigured(): boolean {
  // Only treat keys as real when they look like actual Razorpay credentials
  // (rzp_test_ / rzp_live_). Dummy placeholders or empty strings keep the
  // dev fallback active so the checkout flow is tappable without live keys.
  return Boolean(
    RAZORPAY_KEY_ID &&
      RAZORPAY_KEY_SECRET &&
      (RAZORPAY_KEY_ID.startsWith('rzp_test_') || RAZORPAY_KEY_ID.startsWith('rzp_live_'))
  )
}

export async function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>) {
  if (!razorpayConfigured()) {
    // Dev fallback: synthesise a fake order id so the flow is tappable without live keys.
    return { id: `order_dev_${Date.now()}`, amount: amountPaise, currency: 'INR', dev: true }
  }
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
  })
  if (!response.ok) {
    const body = await response.text()
    logger.error('Razorpay create-order failed', { status: response.status, body })
    throw new Error('Failed to create payment order')
  }
  return (await response.json()) as { id: string; amount: number; currency: string }
}

export function verifyPaymentSignature(input: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): boolean {
  const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(input.razorpay_signature || '', 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) return true
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature || '', 'hex')
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b)
}

export async function nextInvoiceNumber(InvoiceCounter: Model<any>) {
  const year = new Date().getFullYear()
  const counter = await InvoiceCounter.findOneAndUpdate(
    { key: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return `NXB${year}${String(counter.seq).padStart(5, '0')}`
}

function invoiceHtml(order: IOrder, invoiceNumber: string): string {
  const items = order.items ?? []
  const taxable = order.amount
  const cgst = Math.round((taxable * 9) / 100)
  const sgst = Math.round((taxable * 9) / 100)
  const total = taxable + cgst + sgst
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const rows = items
    .map(
      (it) => `<tr>
        <td>${it.label}</td>
        <td class="c">${it.quantity}</td>
        <td class="r">${it.price.toLocaleString('en-IN')}</td>
        <td class="r">${(it.price * it.quantity).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('')

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #14b8a6;padding-bottom:16px">
      <div>
        <div style="font-size:22px;font-weight:700">Nexbaron Pvt Ltd</div>
        <div style="font-size:12px;color:#475569">Digital Division</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#475569">
        <div><strong>GSTIN:</strong> ${BILLING_GSTIN}</div>
        <div>Registered address on file</div>
      </div>
    </div>
    <h2 style="font-size:18px;margin:20px 0 4px">GST Invoice</h2>
    <div style="font-size:12px;color:#475569;margin-bottom:20px">
      Invoice <strong>#${invoiceNumber}</strong> · ${orderDate}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;margin-bottom:20px">
      <strong>Billed to:</strong> ${order.customer.name}<br>
      ${order.customer.company ? `${order.customer.company}<br>` : ''}
      ${order.billing?.address ? `${order.billing.address}<br>` : ''}${order.customer.city ? `${order.customer.city}` : ''}<br>
      ${order.customer.phone || ''}${order.customer.email ? ` · ${order.customer.email}` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:#f1f5f9">
        <th style="text-align:left;padding:8px">Item</th>
        <th class="c" style="text-align:center;padding:8px">Qty</th>
        <th class="r" style="text-align:right;padding:8px">Rate</th>
        <th class="r" style="text-align:right;padding:8px">Amount</th>
      </tr></thead>
      <tbody>${rows}
        <tr>
          <td colspan="3" style="text-align:right;padding:8px;border-top:1px solid #e2e8f0"><strong>Taxable value</strong></td>
          <td class="r" style="text-align:right;padding:8px;border-top:1px solid #e2e8f0"><strong>${taxable.toLocaleString('en-IN')}</strong></td>
        </tr>
        <tr><td colspan="3" style="text-align:right;padding:4px">CGST @ 9%</td><td class="r" style="text-align:right">${cgst.toLocaleString('en-IN')}</td></tr>
        <tr><td colspan="3" style="text-align:right;padding:4px">SGST @ 9%</td><td class="r" style="text-align:right">${sgst.toLocaleString('en-IN')}</td></tr>
        <tr style="background:#f0fdfa">
          <td colspan="3" style="text-align:right;padding:8px;font-size:14px"><strong>Total</strong></td>
          <td class="r" style="text-align:right;padding:8px;font-size:14px"><strong>₹${total.toLocaleString('en-IN')}</strong></td>
        </tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px">
      Payment received via Razorpay. Thank you for choosing Nexbaron. You can track your launch live at
      ${FRONTEND_URL}/digital/orders/${order._id}
    </p>
  </div>`
}

export async function emailInvoice(order: IOrder, invoiceNumber: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — skipping invoice email')
    return false
  }
  const to = order.customer.email
  if (!to) {
    logger.warn('No customer email — skipping invoice email')
    return false
  }
  const html = invoiceHtml(order, invoiceNumber)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: INVOICE_FROM,
      to,
      subject: `Your Nexbaron Digital invoice ${invoiceNumber}`,
      html,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    logger.error('Resend invoice failed', { status: response.status, body })
    return false
  }
  return true
}

export { RAZORPAY_KEY_ID }