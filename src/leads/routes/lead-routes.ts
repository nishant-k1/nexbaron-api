import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { submitLead, listLeads } from '../controllers/lead-controller'

// Public — brand-scoped contact-form submissions.
export const brandContactRouter = Router()
brandContactRouter.post('/contact', submitLead)

// Public — live chat submissions (separate from contact form).
brandContactRouter.post('/chat', (req, res, next) => {
  // Tag chat messages so CRM can filter them separately
  req.body.source = 'live-chat'
  submitLead(req, res).catch(next)
})

// Reads will be consumed by the CRM; protected by staff admin auth.
const adminLeadRouter = Router()
adminLeadRouter.get('/leads', requireAdmin, requireDivision('digital', 'print'), listLeads)

export { adminLeadRouter }
