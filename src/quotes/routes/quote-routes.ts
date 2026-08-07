import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireAdmin, requireDivision, requireRole } from '../../admin/middleware/require-admin'
import {
  getQuote,
  listQuotes,
  myQuotes,
  previewQuote,
  sendQuote,
  submitQuote,
  updateQuote,
} from '../controllers/quote-controller'

// Customer-facing. Mounted only under the runtime brand; auth also enforces
// that the signed token belongs to that brand.
export const customerQuoteRouter = Router()
customerQuoteRouter.post('/quotes', requireAuth, submitQuote)
customerQuoteRouter.get('/quotes/mine', requireAuth, myQuotes)

// Staff-facing. Mounted at /<brand>/admin/quotes.
export const adminQuoteRouter = Router()
adminQuoteRouter.get('/', requireAdmin, requireDivision('digital', 'print'), listQuotes)
adminQuoteRouter.get('/:id', requireAdmin, requireDivision('digital', 'print'), getQuote)
adminQuoteRouter.get('/:id/preview', requireAdmin, requireDivision('digital', 'print'), previewQuote)
adminQuoteRouter.patch('/:id', requireAdmin, requireDivision('digital', 'print'), updateQuote)
adminQuoteRouter.post('/:id/send', requireAdmin, requireDivision('digital', 'print'), requireRole('owner', 'admin'), sendQuote)
