import crypto from 'crypto'
import { Model } from 'mongoose'

import { logger } from '../../../../utils/logger'
import { IOrder } from '../../../../models/order.model'
import { canSendMail, sendMail } from '../../../../utils/mailer'
import { escapeHtml, logoNx, NX_DIGITAL } from '../../../../utils/html'
import { nextSequence } from '../../../../utils/counter'
import { splitGst } from './pricing'
import { DIGITAL_BUSINESS_PROFILE } from '../../content/business-profile'

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || ''
const INVOICE_FROM = process.env.INVOICE_FROM_EMAIL || 'billing@nexbaron.com'
const BILLING_GSTIN = DIGITAL_BUSINESS_PROFILE.gstin
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
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Razorpay is not configured')
    }
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
  if (!razorpayConfigured()) return false
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
  if (!RAZORPAY_WEBHOOK_SECRET) return false
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
  const seq = await nextSequence(InvoiceCounter, `invoice-${year}`)
  return `NXB${year}${String(seq).padStart(5, '0')}`
}

function invoiceHtml(order: IOrder, invoiceNumber: string): string {
  // The invoice lists only what was actually charged: setup always, plus the
  // annual care when the customer pre-pays a year (monthlies start month 2).
  const chargedCycles = order.billingCycle === 'annual' ? new Set(['setup', 'annual']) : new Set(['setup'])
  const items = (order.items ?? []).filter((item) => chargedCycles.has(item.billingCycle))
  // Catalog prices are charged as displayed, so split GST out of the paid total.
  const total = order.amount
  const gst = splitGst(total)
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const rows = items
    .map(
      (it) => `<tr>
        <td>${escapeHtml(it.label)}</td>
        <td class="c">${it.quantity}</td>
        <td class="r">${it.price.toLocaleString('en-IN')}</td>
        <td class="r">${(it.price * it.quantity).toLocaleString('en-IN')}</td>
      </tr>`
    )
    .join('')

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #14b8a6;padding-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        ${logoNx(NX_DIGITAL)}
        <div>
          <div style="font-size:22px;font-weight:700">Nexbaron</div>
          <div style="font-size:12px;color:#475569">Digital Division</div>
        </div>
      </div>
      <div style="text-align:right;font-size:12px;color:#475569">
        ${BILLING_GSTIN ? `<div><strong>GSTIN:</strong> ${escapeHtml(BILLING_GSTIN)}</div>` : '<div><strong>GST</strong></div>'}
        <div>Registered address on file</div>
      </div>
    </div>
    <h2 style="font-size:18px;margin:20px 0 4px">GST Invoice</h2>
    <div style="font-size:12px;color:#475569;margin-bottom:20px">
      Invoice <strong>#${escapeHtml(invoiceNumber)}</strong> · ${orderDate}
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;margin-bottom:20px">
      <strong>Billed to:</strong> ${escapeHtml(order.customer.name)}<br>
      ${order.customer.company ? `${escapeHtml(order.customer.company)}<br>` : ''}
      ${order.billing?.address ? `${escapeHtml(order.billing.address)}<br>` : ''}${order.customer.city ? `${escapeHtml(order.customer.city)}` : ''}<br>
      ${escapeHtml(order.customer.phone || '')}${order.customer.email ? ` · ${escapeHtml(order.customer.email)}` : ''}
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
          <td class="r" style="text-align:right;padding:8px;border-top:1px solid #e2e8f0"><strong>${gst.taxable.toLocaleString('en-IN')}</strong></td>
        </tr>
        <tr><td colspan="3" style="text-align:right;padding:4px">CGST @ 9%</td><td class="r" style="text-align:right">${gst.cgst.toLocaleString('en-IN')}</td></tr>
        <tr><td colspan="3" style="text-align:right;padding:4px">SGST @ 9%</td><td class="r" style="text-align:right">${gst.sgst.toLocaleString('en-IN')}</td></tr>
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
  if (!canSendMail()) {
    logger.warn('SMTP not configured — skipping invoice email')
    return false
  }
  const to = order.customer.email
  if (!to) {
    logger.warn('No customer email — skipping invoice email')
    return false
  }
  const html = invoiceHtml(order, invoiceNumber)
  try {
    await sendMail({
      from: INVOICE_FROM,
      to,
      subject: `Your Nexbaron Digital invoice ${invoiceNumber}`,
      html,
    })
    return true
  } catch {
    return false
  }
}

export { RAZORPAY_KEY_ID }
