import { Router } from 'express'
import { requireAuth } from '../../shared/middleware/require-auth'
import { submitLead, listLeads } from '../controllers/lead-controller'

export const leadRouter = Router()

// Public — stores web contact-form submissions.
export const contactRouter = Router()
contactRouter.post('/contact', submitLead)

// Reads will be consumed by the CRM (Phase 1+); protected now for parity.
const adminLeadRouter = Router()
adminLeadRouter.get('/leads', requireAuth, listLeads)

export { adminLeadRouter }