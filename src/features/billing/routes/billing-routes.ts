import { Router } from 'express'
import { requireAuth } from '../../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  getMyInvoices,
  getMyInvoice,
  listInvoices,
  getInvoice,
  createInvoice,
  createPaymentOrder,
  verifyPayment,
  downloadInvoiceReceipt,
} from '../controllers/billing-controller'

export const customerBillingRouter = Router()
customerBillingRouter.get('/billing/invoices', requireAuth, getMyInvoices)
customerBillingRouter.get('/billing/invoices/:number/receipt/:paymentId', requireAuth, downloadInvoiceReceipt)
customerBillingRouter.get('/billing/invoices/:number/receipt', requireAuth, downloadInvoiceReceipt)
customerBillingRouter.get('/billing/invoices/:number', requireAuth, getMyInvoice)
customerBillingRouter.post('/billing/invoices/:number/pay', requireAuth, createPaymentOrder)
customerBillingRouter.post('/billing/payments/verify', requireAuth, verifyPayment)

export const adminBillingRouter = Router()
adminBillingRouter.get('/billing/invoices', requireAdmin, requireDivision('digital', 'print'), listInvoices)
adminBillingRouter.post('/billing/invoices', requireAdmin, requireDivision('digital', 'print'), createInvoice)
adminBillingRouter.get('/billing/invoices/:number', requireAdmin, requireDivision('digital', 'print'), getInvoice)
