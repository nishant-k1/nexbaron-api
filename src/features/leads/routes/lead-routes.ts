import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { submitLead, listLeads } from '../controllers/lead-controller'

export const leadRouter = Router()

// Public — stores web contact-form submissions.
export const contactRouter = Router()
contactRouter.post('/contact', submitLead)

// Reads will be consumed by the CRM; protected by staff admin auth.
const adminLeadRouter = Router()
adminLeadRouter.get('/leads', requireAdmin, requireDivision('digital', 'print'), listLeads)

export { adminLeadRouter }