import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { Types } from 'mongoose'
import { getDivisionModels } from '../../../models/registry'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { createInvoiceModel } from '../../../models/invoice.model'
import { buildLaunchStages } from '../../digital/payments/services/pricing-service'
import { computeBillingSummary, computeInstallments, computeNextPaymentCap, buildBillingView } from '../services/billing-service'
import { escapeHtml, logoNx } from '../../../utils/html'
import { NX_DIGITAL, NX_PRINT } from '../../../config/constants'
import { canSendMail, sendMail } from '../../../utils/mailer'
import { renderInvoiceReceiptPdf } from '../services/billing-receipt-pdf'
import servicePricingPlans from '../../digital/catalog/plans/v1/plans-type'

function accountFilterForUser(division: 'digital' | 'print', userId?: string) {
  return { division, userId }
}

export async function getMyInvoices(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Invoice } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.json({ success: true, invoices: [] })
      return
    }
    const invoices = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .find({ accountId: account.accountCode, division })
      .sort({ createdAt: -1 })
      .lean()
    const enriched = invoices.map((invoice) => ({
      ...invoice,
      summary: buildBillingView(invoice),
    }))
    const rk = process.env.RAZORPAY_KEY_ID
    const razorpayKeyId = rk && (rk.startsWith('rzp_test_') || rk.startsWith('rzp_live_')) ? rk : ''
    res.json({ success: true, invoices: enriched, razorpayKeyId })
  } catch (error) {
    return handleError('getMyInvoices', req, res, error, 'Failed to load invoices')
  }
}

export async function getMyInvoice(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Invoice } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ invoiceNumber: String(req.params.number), accountId: account.accountCode, division })
      .lean()
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' })
      return
    }
    const rk = process.env.RAZORPAY_KEY_ID
    const razorpayKeyId = rk && (rk.startsWith('rzp_test_') || rk.startsWith('rzp_live_')) ? rk : ''
    const summary = buildBillingView(invoice)
    const installments = computeInstallments(invoice)
    res.json({ success: true, invoice, razorpayKeyId, summary, installments })
  } catch (error) {
    return handleError('getMyInvoice', req, res, error, 'Failed to load invoice')
  }
}

export async function listInvoices(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Invoice } = getDivisionModels(division)
    const accountCode = req.query.accountCode as string | undefined
    const status = req.query.status as string | undefined
    const filter: Record<string, unknown> = { division }
    if (accountCode) filter.accountId = accountCode
    if (status) filter.status = status
    const invoices = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
    res.json({ success: true, invoices })
  } catch (error) {
    return handleError('listInvoices', req, res, error, 'Failed to load invoices')
  }
}

export async function getInvoice(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Invoice } = getDivisionModels(division)
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ invoiceNumber: String(req.params.number), division })
      .lean()
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' })
      return
    }
    const rk = process.env.RAZORPAY_KEY_ID
    const razorpayKeyId = rk && (rk.startsWith('rzp_test_') || rk.startsWith('rzp_live_')) ? rk : ''
    const summary = computeBillingSummary(invoice)
    const installments = computeInstallments(invoice)
    res.json({ success: true, invoice, razorpayKeyId, summary, installments })
  } catch (error) {
    return handleError('getInvoice', req, res, error, 'Failed to load invoice')
  }
}

export async function downloadInvoiceReceipt(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const invoiceNumber = String(req.params.number || '').trim()
    const paymentId = req.params.paymentId ? String(req.params.paymentId).trim() : undefined
    if (!invoiceNumber) {
      res.status(400).json({ success: false, message: 'Invoice number required' })
      return
    }
    const { Account, Invoice } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ invoiceNumber, accountId: account.accountCode, division })
      .lean()
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' })
      return
    }
    const summary = computeBillingSummary(invoice)
    if (summary.totalPaid <= 0) {
      res.status(400).json({ success: false, message: 'No paid amount to generate receipt' })
      return
    }
    let targetPayment: any = null
    let receiptAmount = summary.totalPaid
    let receiptDate = invoice.updatedAt || invoice.createdAt
    let receiptId = invoiceNumber
    if (paymentId) {
      targetPayment = (invoice.payments || []).find((p: any) => p.paymentId === paymentId || p.razorpayPaymentId === paymentId)
      if (!targetPayment || targetPayment.status !== 'SUCCESS') {
        res.status(404).json({ success: false, message: 'Payment not found or not successful' })
        return
      }
      receiptAmount = targetPayment.amount
      receiptDate = targetPayment.at
      receiptId = `${invoiceNumber}-${targetPayment.paymentId.slice(-6).toUpperCase()}`
    }
    const brand = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
    const colors = division === 'digital' ? NX_DIGITAL : NX_PRINT
    const accent = colors.stop1
    const date = new Date(receiptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const createdDate = new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const customerName = escapeHtml(account.name || '—')
    const customerEmail = escapeHtml(account.email || '')
    const customerPhone = escapeHtml(account.phone || '')
    const safeInvoice = escapeHtml(invoiceNumber)
    const safeReceiptId = escapeHtml(receiptId)
    const lineRows = (invoice.lineItems || [])
      .map(
        (li: any) =>
          `<tr><td>${escapeHtml(li.label)}</td><td style="text-align:right">${inrFormat(li.amount)}</td><td style="text-align:center;color:#64748b">${escapeHtml(li.type)}</td></tr>`,
      )
      .join('')
    const paymentsToShow = paymentId && targetPayment ? [targetPayment] : (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS')
    const paymentRows = paymentsToShow
      .map(
        (p: any) =>
          `<tr><td>${new Date(p.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${escapeHtml(p.razorpayPaymentId || p.paymentId.slice(-8).toUpperCase())}</td><td style="text-align:right">${inrFormat(p.amount)}</td><td style="text-align:center;color:#059669">Paid</td></tr>`,
      )
      .join('')
    const wantPdf = String((req.query as any).format || '').toLowerCase() === 'pdf' || String(req.headers.accept || '').includes('application/pdf')
    if (wantPdf) {
      const pdf = await renderInvoiceReceiptPdf(invoice, account, { paymentId })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${receiptId}.pdf"`)
      res.send(pdf)
      return
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${safeReceiptId}</title>
<style>body{font-family:Arial,sans-serif;max-width:640px;margin:40px auto;color:#0f172a;padding:0 16px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${accent};padding-bottom:16px;margin-bottom:24px}
.header h1{font-size:20px;margin:0}.header p{font-size:12px;color:#64748b;margin:2px 0}
.brand{display:flex;align-items:center;gap:12px}
.meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:24px;gap:16px}
.meta strong{color:#64748b}
.table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
.table th{text-align:left;padding:10px 8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:11px;text-transform:uppercase}
.table td{padding:10px 8px;border-bottom:1px solid #f1f5f9}
.total{width:100%;border-collapse:collapse;margin-bottom:20px}
.total td{padding:8px;text-align:right;font-size:13px}
.total .grand{font-size:18px;font-weight:bold;border-top:2px solid #0f172a}
.footer{font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px;text-align:center}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#ecfdf5;color:#059669}
</style></head><body>
<div class="header">
  <div class="brand">
    ${logoNx(colors)}
    <div><h1>${brand}</h1><p>Payment Receipt</p></div>
  </div>
  <div style="text-align:right"><p><strong>Receipt #</strong> ${safeReceiptId}</p><p>${date}</p><p><span class="badge">Paid</span></p></div>
</div>
<div class="meta">
  <div><strong>Bill to</strong><br>${customerName}${customerEmail ? `<br>${customerEmail}` : ''}${customerPhone ? `<br>${customerPhone}` : ''}<br><span style="color:#64748b">${escapeHtml(account.accountCode)}</span></div>
  <div style="text-align:right"><strong>Invoice</strong><br>${safeInvoice}<br>${createdDate}<br>${escapeHtml(invoice.status)}</div>
</div>
<table class="table">
  <tr><th>Description</th><th style="text-align:right">Amount</th><th style="text-align:center">Type</th></tr>
  ${lineRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">No line items</td></tr>'}
</table>
<table class="table">
  <tr><th>Date</th><th style="text-align:right">Paid</th><th style="text-align:center">Status</th></tr>
  ${paymentRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8">No payments</td></tr>'}
</table>
<table class="total">
  <tr><td>Invoice Total</td><td style="text-align:right">${inrFormat(invoice.amount)}</td></tr>
  <tr><td>Total Paid${paymentId ? ` (this receipt)` : ''}</td><td style="text-align:right;color:#059669">${inrFormat(receiptAmount)}</td></tr>
  <tr><td>Amount Due</td><td style="text-align:right">${inrFormat(invoice.amount - summary.totalPaid)}</td></tr>
  <tr><td class="grand" colspan="2" style="text-align:right">Balance Due: ${inrFormat(Math.max(0, invoice.amount - summary.totalPaid))}</td></tr>
</table>
<div class="footer">${brand} · nexbaron.com · This is a computer-generated receipt. For support, contact hello@nexbaron.com</div>
</body></html>`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="receipt-${receiptId}.html"`)
    res.send(html)
  } catch (error) {
    return handleError('downloadInvoiceReceipt', req, res, error, 'Failed to generate receipt')
  }
}

function inrFormat(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export async function createInvoice(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account, Invoice, InvoiceCounter } = getDivisionModels(division)
    const { accountCode, packageId, amount, currency, dueDate, lineItems } = req.body
    if (!accountCode || !amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'accountCode and a positive amount are required' })
      return
    }
    // Validate lineItems if provided — sum must equal amount, types must be valid
    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const validTypes = new Set(['ONE_TIME', 'RECURRING'])
      for (const li of lineItems) {
        if (typeof li.label !== 'string' || !li.label.trim()) {
          res.status(400).json({ success: false, message: 'Each line item must have a label' })
          return
        }
        if (typeof li.amount !== 'number' || li.amount < 0) {
          res.status(400).json({ success: false, message: 'Each line item must have a non-negative amount' })
          return
        }
        if (!validTypes.has(li.type)) {
          res.status(400).json({ success: false, message: 'Line item type must be ONE_TIME or RECURRING' })
          return
        }
      }
      const sum = lineItems.reduce((s: number, li: any) => s + Number(li.amount || 0), 0)
      if (sum !== Number(amount)) {
        res.status(400).json({ success: false, message: `Sum of line items (${sum}) must equal amount (${amount})` })
        return
      }
    }
    const account = await Account.findOne({ accountCode, division }).lean()
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }
    const year = new Date().getFullYear()
    const seq = await (await import('../../../utils/counter.js')).nextSequence(InvoiceCounter, `invoice-${division}-${year}`)
    const invoiceNumber = `NXB${division === 'digital' ? 'D' : 'P'}${year}${String(seq).padStart(5, '0')}`
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>).create({
      invoiceNumber,
      accountId: account.accountCode,
      packageId,
      division,
      status: 'PENDING',
      amount,
      currency: currency || 'INR',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      lineItems: Array.isArray(lineItems) ? lineItems : [],
      createdBy: req.staffAuth.name,
    })
    res.status(201).json({ success: true, invoice: invoice.toObject() })
  } catch (error) {
    return handleError('createInvoice', req, res, error, 'Failed to create invoice')
  }
}

export async function createPaymentOrder(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Invoice } = getDivisionModels(division)
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ invoiceNumber: String(req.params.number), accountId: account.accountCode, division, status: 'PENDING' })
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found or already paid' })
      return
    }
    
    // Support partial/advance payment — clamp to amountDue (not invoice.amount) to prevent overpay on second half
    const amountDue = computeNextPaymentCap(invoice as any)
    if (amountDue <= 0) {
      res.status(400).json({ success: false, message: 'Invoice already paid' })
      return
    }
    const requestedAmount = req.body.amount ? Number(req.body.amount) : null
    let payAmount = amountDue
    if (requestedAmount && requestedAmount > 0 && requestedAmount <= amountDue) {
      payAmount = requestedAmount
    } else if (requestedAmount && requestedAmount > amountDue) {
      res.status(400).json({ success: false, message: `Amount exceeds due balance of ${amountDue}` })
      return
    }
    
    const { createRazorpayOrder, razorpayConfigured } = await import('../../digital/payments/services/razorpay-service.js')
    const order = await createRazorpayOrder(payAmount * 100, invoice.invoiceNumber, {
      accountId: account.accountCode,
      division,
    })
    res.json({ success: true, order, keyId: razorpayConfigured() ? (process.env.RAZORPAY_KEY_ID ?? '') : '' })
  } catch (error) {
    return handleError('createPaymentOrder', req, res, error, 'Failed to initiate payment')
  }
}

export async function verifyPayment(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Invoice } = getDivisionModels(division)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceNumber, amount: bodyAmount } = req.body
    const account = await Account.findOne(accountFilterForUser(division, userId)).lean()
    if (!account) {
      res.status(403).json({ success: false, message: 'Not linked to an account' })
      return
    }
    const invoice = await (Invoice as ReturnType<typeof createInvoiceModel>)
      .findOne({ invoiceNumber: String(invoiceNumber), accountId: account.accountCode, division, status: 'PENDING' })
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found or already paid' })
      return
    }

    // Idempotency: if this razorpay_payment_id already recorded as SUCCESS, return early (webhook retry / double-click)
    if (razorpay_payment_id) {
      const dup = (invoice.payments || []).some((p: any) => p.razorpayPaymentId === razorpay_payment_id && p.status === 'SUCCESS')
      if (dup) {
        const { computeBillingSummary: _s } = await import('../services/billing-service.js')
        const _sum = _s(invoice as any)
        res.json({ success: true, message: 'Payment already recorded', paidAmount: 0, totalPaid: _sum.totalPaid, isFullyPaid: invoice.status === 'PAID', orderId: null, duplicate: true })
        return
      }
    }

    const { verifyPaymentSignature, razorpayConfigured, fetchRazorpayPaymentAmount } = await import('../../digital/payments/services/razorpay-service.js')
    if (!razorpayConfigured() && process.env.NODE_ENV === 'production') {
      res.status(503).json({ success: false, message: 'Payments are not configured' })
      return
    }
    const signatureOk = !razorpayConfigured() || verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
    if (!signatureOk) {
      const failAmount = bodyAmount ? Number(bodyAmount) : 0
      // Don't terminally FAIL the invoice — allow retry (keep PENDING), just log failed attempt
      await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
        { _id: invoice._id },
        { $push: { payments: { paymentId: `pay_${Date.now()}`, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, amount: failAmount || 0, status: 'FAILED', at: new Date() } } }
      )
      res.status(400).json({ success: false, message: 'Payment signature verification failed' })
      return
    }

    // Determine actual amount paid — prefer Razorpay API amount, then client hint, clamped to due
    const amountDue = computeNextPaymentCap(invoice as any)
    if (amountDue <= 0) {
      res.status(400).json({ success: false, message: 'Invoice already paid' })
      return
    }
    let payAmount = amountDue
    const resolveBodyAmount = (): number | null => {
      if (bodyAmount == null || bodyAmount === '' || Number.isNaN(Number(bodyAmount))) return null
      const requested = Number(bodyAmount)
      if (requested <= 0) return null
      if (requested > amountDue) return null
      return requested
    }
    if (razorpayConfigured() && razorpay_payment_id) {
      const razorpayAmount = await fetchRazorpayPaymentAmount(razorpay_payment_id)
      if (razorpayAmount != null) {
        if (razorpayAmount > amountDue) {
          res.status(400).json({ success: false, message: `Payment amount exceeds due balance of ${amountDue}` })
          return
        }
        payAmount = razorpayAmount > 0 ? razorpayAmount : amountDue
      } else {
        const fromBody = resolveBodyAmount()
        if (fromBody != null) payAmount = fromBody
      }
    } else {
      const fromBody = resolveBodyAmount()
      if (fromBody != null) {
        payAmount = fromBody
      } else if (bodyAmount != null && bodyAmount !== '' && !Number.isNaN(Number(bodyAmount)) && Number(bodyAmount) > amountDue) {
        res.status(400).json({ success: false, message: `Amount exceeds due balance of ${amountDue}` })
        return
      }
    }
    const existingPaid = (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS').reduce((sum: number, p: any) => sum + p.amount, 0)
    const newTotalPaid = existingPaid + payAmount
    const projectedSummary = computeBillingSummary({
      ...invoice.toObject(),
      payments: [...(invoice.payments || []), { amount: payAmount, status: 'SUCCESS' }],
    })
    const isFullyPaid = projectedSummary.amountDue === 0
    const newStatus = isFullyPaid ? 'PAID' : 'PENDING'

    const newPaymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const newPayment = {
      paymentId: newPaymentId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: payAmount,
      status: 'SUCCESS' as const,
      at: new Date(),
    }
    // Atomic guard: only block if this razorpay_payment_id is already SUCCESS (not FAILED retries)
    const updateFilter: Record<string, unknown> = { _id: invoice._id }
    if (razorpay_payment_id) {
      updateFilter.payments = { $not: { $elemMatch: { razorpayPaymentId: razorpay_payment_id, status: 'SUCCESS' } } }
    }
    const updateRes = await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
      updateFilter,
      {
        $push: { payments: newPayment },
        $set: { status: newStatus },
      }
    )
    if (updateRes.modifiedCount === 0) {
      const freshInvoice = await (Invoice as ReturnType<typeof createInvoiceModel>).findOne({ _id: invoice._id }).lean()
      const alreadySuccess = razorpay_payment_id && (freshInvoice?.payments || []).some(
        (p: any) => p.razorpayPaymentId === razorpay_payment_id && p.status === 'SUCCESS',
      )
      if (alreadySuccess) {
        const freshTotal = freshInvoice ? computeBillingSummary(freshInvoice as any).totalPaid : newTotalPaid
        res.json({ success: true, message: 'Payment already recorded', paidAmount: 0, totalPaid: freshTotal, isFullyPaid: freshInvoice?.status === 'PAID', orderId: null, duplicate: true })
        return
      }
      res.status(409).json({ success: false, message: 'Payment could not be recorded. Please refresh and contact support if you were charged.' })
      return
    }
    if (isFullyPaid) {
      // Only advance to CUSTOMER if not already there — monotone, no duplicate history on retry
      await Account.updateOne(
        { accountCode: account.accountCode, division, lifecycleStage: { $ne: 'CUSTOMER' } },
        { $set: { lifecycleStage: 'CUSTOMER' }, $push: { stageHistory: { stage: 'CUSTOMER', by: account.name, at: new Date() } } }
      )
    } else {
      // Partial: move to PAYMENT_PENDING but never regress a CUSTOMER (second purchase's 50% shouldn't drag back)
      await Account.updateOne(
        { accountCode: account.accountCode, division, lifecycleStage: { $in: ['PROPOSAL_ACCEPTED', 'PAYMENT_PENDING'] } },
        { $set: { lifecycleStage: 'PAYMENT_PENDING' }, $push: { stageHistory: { stage: 'PAYMENT_PENDING', by: account.name, at: new Date() } } }
      )
    }

    // Create Order for Hub's Orders list (idempotent by invoiceNumber)
    let orderId: string | null = null
    try {
      const { Order, Lead } = getDivisionModels(division)
      const existingOrder = await Order.findOne({ invoiceNumber: invoice.invoiceNumber, division }).lean()
      if (existingOrder) {
        orderId = String(existingOrder._id)
        const orderPayment = {
          method: 'razorpay' as const,
          amount: payAmount,
          receivedAt: new Date(),
          reference: razorpay_payment_id || newPaymentId,
        }
        const orderUpdate: Record<string, unknown> = {
          amountPaid: newTotalPaid,
          status: 'active',
        }
        await Order.updateOne(
          { _id: existingOrder._id },
          {
            $set: orderUpdate,
            $push: { payments: orderPayment, stageHistory: { stage: 'active', by: account.name, at: new Date() } },
          },
        )
      } else {
        // Find or create Lead for this account
        let lead: any = null
        if (account.leadId) {
          try { lead = await Lead.findById(account.leadId).lean() } catch {}
        }
        if (!lead && account.email) {
          lead = await Lead.findOne({ email: account.email, division }).sort({ createdAt: -1 }).lean()
        }
        if (!lead && account.phone) {
          lead = await Lead.findOne({ phone: account.phone, division }).sort({ createdAt: -1 }).lean()
        }
        if (!lead) {
          lead = await Lead.create({
            division,
            name: account.name,
            email: account.email,
            phone: account.phone,
            company: account.company,
            status: 'won',
            projectId: randomUUID(),
          })
        } else if (lead.status !== 'won') {
          await Lead.updateOne({ _id: lead._id }, { $set: { status: 'won' } })
        }

        const items = (invoice.lineItems || []).map((li: any) => ({
          kind: 'plan' as const,
          planId: invoice.packageId || invoice.proposalCode || 'plan',
          label: li.label,
          billingCycle: li.type === 'ONE_TIME' ? 'setup' as const : 'monthly' as const,
          price: li.amount,
          quantity: 1,
        }))

        const launchDate = new Date()
        launchDate.setDate(launchDate.getDate() + 30)
        
        const newOrder = await Order.create({
          projectId: randomUUID(),
          userId: new Types.ObjectId(userId),
          leadId: lead._id,
          division,
          customer: {
            name: account.name,
            email: account.email,
            phone: account.phone,
            company: account.company,
          },
          service: invoice.packageId || 'plan',
          planLabel: invoice.packageId ? (servicePricingPlans[invoice.packageId]?.name || invoice.packageId) : undefined,
          amount: invoice.amount,
          currency: invoice.currency || 'INR',
          status: 'active',
          items,
          amountPaid: newTotalPaid,
          invoiceNumber: invoice.invoiceNumber,
          proposalCode: invoice.proposalCode,
          launchDate,
          launchDays: 30,
          milestones: (() => {
            const launchDays = 30
            const launchDate = new Date()
            launchDate.setDate(launchDate.getDate() + launchDays)
            return buildLaunchStages(launchDays).map((m) => {
              const date = new Date(launchDate)
              date.setDate(date.getDate() - (launchDays - m.endDay))
              return {
                key: m.key,
                label: m.label,
                dayLabel: m.dayLabel,
                date,
                status: (m.key === 'payment' && isFullyPaid) ? ('done' as const) : ('pending' as const),
                completedAt: (m.key === 'payment' && isFullyPaid) ? new Date() : undefined,
              }
            })
          })(),
          stageHistory: [{ stage: 'active', by: account.name, at: new Date() }],
          payments: [
            ...(invoice.payments || [])
              .filter((p: any) => p.status === 'SUCCESS')
              .map((p: any) => ({
                method: 'razorpay' as const,
                amount: p.amount,
                receivedAt: p.at,
                reference: p.razorpayPaymentId || p.paymentId,
              })),
            {
              method: 'razorpay' as const,
              amount: payAmount,
              receivedAt: new Date(),
              reference: razorpay_payment_id || newPaymentId,
            },
          ],
        })
        orderId = String(newOrder._id)
      }
    } catch (e) {
      console.error('Failed to create/update order from invoice', e)
    }

    // Email PDF receipt automatically (single-payment, like razorpay-service.ts:175)
    try {
      if (canSendMail() && account.email) {
        const freshInvoice = await (Invoice as ReturnType<typeof createInvoiceModel>).findOne({ _id: invoice._id }).lean()
        if (freshInvoice) {
          const pdf = await renderInvoiceReceiptPdf(freshInvoice as any, account as any, { paymentId: newPaymentId })
          const brandName = division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
          await sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'hello@nexbaron.com',
            to: account.email,
            subject: `Payment receipt — ${freshInvoice.invoiceNumber} — ${inrFormat(payAmount)} paid`,
            html: `<p>Hi ${escapeHtml(account.name)},</p><p>Your payment of ${inrFormat(payAmount)} for invoice ${escapeHtml(freshInvoice.invoiceNumber)} was successful. Receipt attached.</p><p> — ${brandName}</p>`,
            attachments: [{ filename: `receipt-${freshInvoice.invoiceNumber}-${newPaymentId.slice(-6)}.pdf`, content: pdf }],
          })
        }
      }
    } catch (e) {
      console.error('Failed to email receipt', e)
    }

    res.json({ success: true, message: 'Payment successful', paidAmount: payAmount, totalPaid: newTotalPaid, isFullyPaid, orderId })
  } catch (error) {
    return handleError('verifyPayment', req, res, error, 'Failed to verify payment')
  }
}
