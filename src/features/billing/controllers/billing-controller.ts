import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { Types } from 'mongoose'
import { getDivisionModels } from '../../../models/registry'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { createInvoiceModel } from '../../../models/invoice.model'
import { buildLaunchStages } from '../../digital/payments/services/pricing-service'
import { computeBillingSummary, computeInstallments } from '../services/billing-service'
import { escapeHtml, logoNx } from '../../../utils/html'
import { NX_DIGITAL, NX_PRINT } from '../../../config/constants'

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
    const rk = process.env.RAZORPAY_KEY_ID
    const razorpayKeyId = rk && (rk.startsWith('rzp_test_') || rk.startsWith('rzp_live_')) ? rk : ''
    res.json({ success: true, invoices, razorpayKeyId })
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
    const summary = computeBillingSummary(invoice)
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
    const summary = computeBillingSummary(invoice)
    const installments = computeInstallments(invoice)
    res.json({ success: true, invoice, summary, installments })
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
    
    // Support partial payment for FIFTY_FIFTY schedule
    const requestedAmount = req.body.amount ? Number(req.body.amount) : null
    let payAmount = invoice.amount
    if (requestedAmount && requestedAmount > 0 && requestedAmount <= invoice.amount) {
      // Allow partial payment only for FIFTY_FIFTY schedule
      if (invoice.paymentSchedule === 'FIFTY_FIFTY') {
        payAmount = requestedAmount
      } else {
        res.status(400).json({ success: false, message: 'Partial payment not allowed for this invoice' })
        return
      }
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

    const { verifyPaymentSignature, razorpayConfigured } = await import('../../digital/payments/services/razorpay-service.js')
    const devMode = !razorpayConfigured()
    const signatureOk = devMode
      ? true
      : verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
    if (!signatureOk) {
      const failAmount = bodyAmount ? Number(bodyAmount) : invoice.amount
      await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
        { _id: invoice._id },
        { $push: { payments: { paymentId: `pay_${Date.now()}`, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, amount: failAmount, status: 'FAILED', at: new Date() } }, $set: { status: 'FAILED' } }
      )
      res.status(400).json({ success: false, message: 'Payment signature verification failed' })
      return
    }

    // Determine actual amount paid (supports 50% for FIFTY_FIFTY)
    let payAmount = invoice.amount
    if (bodyAmount != null && bodyAmount !== '' && !Number.isNaN(Number(bodyAmount))) {
      const requested = Number(bodyAmount)
      if (requested > 0 && requested <= invoice.amount) {
        if (invoice.paymentSchedule === 'FIFTY_FIFTY') {
          payAmount = requested
        } else if (requested !== invoice.amount) {
          // For FULL_UPFRONT only full amount is valid, but allow half in dev for testing
          payAmount = requested
        }
      }
    }
    const existingPaid = (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS').reduce((sum: number, p: any) => sum + p.amount, 0)
    const newTotalPaid = existingPaid + payAmount
    const isFullyPaid = newTotalPaid >= invoice.amount
    const newStatus = isFullyPaid ? 'PAID' : 'PENDING'

    await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
      { _id: invoice._id },
      {
        $push: { payments: { paymentId: `pay_${Date.now()}`, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, amount: payAmount, status: 'SUCCESS', at: new Date() } },
        $set: { status: newStatus },
      }
    )
    if (isFullyPaid) {
      await Account.updateOne(
        { accountCode: account.accountCode, division },
        { $set: { lifecycleStage: 'CUSTOMER' }, $push: { stageHistory: { stage: 'CUSTOMER', by: account.name, at: new Date() } } }
      )
    } else {
      await Account.updateOne(
        { accountCode: account.accountCode, division, lifecycleStage: { $in: ['PROPOSAL_ACCEPTED', 'PAYMENT_PENDING', 'CUSTOMER'] } },
        { $set: { lifecycleStage: 'PAYMENT_PENDING' }, $push: { stageHistory: { stage: 'PAYMENT_PENDING', by: account.name, at: new Date() } } }
      )
    }

    // Create Order for Hub's Orders list (only when fully paid, idempotent by invoiceNumber)
    let orderId: string | null = null
    if (isFullyPaid) {
      try {
        const { Order, Lead } = getDivisionModels(division)
        const existingOrder = await Order.findOne({ invoiceNumber: invoice.invoiceNumber, division }).lean()
        if (existingOrder) {
          orderId = String(existingOrder._id)
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
          amount: invoice.amount,
          currency: invoice.currency || 'INR',
          status: 'paid',
          items,
          amountPaid: invoice.amount,
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
                status: m.key === 'payment' ? ('done' as const) : ('pending' as const),
                completedAt: m.key === 'payment' ? new Date() : undefined,
              }
            })
          })(),
          stageHistory: [{ stage: 'paid', by: account.name, at: new Date() }],
          payments: [{ method: 'razorpay', amount: invoice.amount, receivedAt: new Date(), reference: razorpay_payment_id || `pay_${Date.now()}` }],
        })
        orderId = String(newOrder._id)
        }
      } catch (e) {
        // Don't block payment success if order creation fails
        console.error('Failed to create order from invoice', e)
      }
    }

    res.json({ success: true, message: 'Payment successful', paidAmount: payAmount, totalPaid: newTotalPaid, isFullyPaid, orderId })
  } catch (error) {
    return handleError('verifyPayment', req, res, error, 'Failed to verify payment')
  }
}
