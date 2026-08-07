import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { submitLead, listLeads } from '../controllers/lead-controller'

// Public — brand-scoped contact-form submissions.
export const brandContactRouter = Router()
brandContactRouter.post('/contact', submitLead)

// Reads will be consumed by the CRM; protected by staff admin auth.
const adminLeadRouter = Router()
adminLeadRouter.get('/leads', requireAdmin, requireDivision('digital', 'print'), listLeads)

export { adminLeadRouter }
