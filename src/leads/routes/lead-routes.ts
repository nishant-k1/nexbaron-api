import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { submitLead, listLeads, updateLeadStatus, createLead } from '../controllers/lead-controller'
import { rateLimit } from '../../utils/rate-limit'

// Public — brand-scoped contact-form submissions.
export const brandContactRouter = Router()
brandContactRouter.post('/contact', rateLimit({ windowMs: 10 * 60 * 1000, max: 30 }), submitLead)

// Reads will be consumed by the CRM; protected by staff admin auth.
const adminLeadRouter = Router()
adminLeadRouter.get('/leads', requireAdmin, requireDivision('digital', 'print'), listLeads)
adminLeadRouter.post('/leads', requireAdmin, requireDivision('digital', 'print'), createLead)
adminLeadRouter.patch('/leads/:id', requireAdmin, requireDivision('digital', 'print'), updateLeadStatus)

export { adminLeadRouter }
