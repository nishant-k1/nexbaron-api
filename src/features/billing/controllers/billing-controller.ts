import { Request, Response } from 'express'
import { getDivisionModels } from '../../../models/registry'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { createInvoiceModel } from '../../../models/invoice.model'

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
    res.json({ success: true, invoice, razorpayKeyId })
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
    res.json({ success: true, invoice })
  } catch (error) {
    return handleError('getInvoice', req, res, error, 'Failed to load invoice')
  }
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceNumber } = req.body
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
      await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
        { _id: invoice._id },
        { $push: { payments: { paymentId: `pay_${Date.now()}`, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, amount: invoice.amount, status: 'FAILED', at: new Date() } }, $set: { status: 'FAILED' } }
      )
      res.status(400).json({ success: false, message: 'Payment signature verification failed' })
      return
    }

    await (Invoice as ReturnType<typeof createInvoiceModel>).updateOne(
      { _id: invoice._id },
      {
        $push: { payments: { paymentId: `pay_${Date.now()}`, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, amount: invoice.amount, status: 'SUCCESS', at: new Date() } },
        $set: { status: 'PAID' },
      }
    )
    await Account.updateOne(
      { accountCode: account.accountCode, division },
      { $set: { lifecycleStage: 'CUSTOMER' }, $push: { stageHistory: { stage: 'CUSTOMER', by: account.name, at: new Date() } } }
    )
    res.json({ success: true, message: 'Payment successful' })
  } catch (error) {
    return handleError('verifyPayment', req, res, error, 'Failed to verify payment')
  }
}
