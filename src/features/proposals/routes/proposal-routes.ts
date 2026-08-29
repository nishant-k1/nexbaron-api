import { Router } from 'express'
import { requireAuth } from '../../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  getMyProposals,
  listProposals,
  getProposal,
  createProposal,
  createProposalFromPlan,
  createProposalFromPackage,
  updateProposal,
  sendProposal,
  acceptProposal,
  getInvoiceForProposal,
  getProposalPdf,
} from '../controllers/proposal-controller'

export const customerProposalRouter = Router()
customerProposalRouter.get('/proposals', requireAuth, getMyProposals)
customerProposalRouter.post('/proposals/from-plan', requireAuth, createProposalFromPlan)
customerProposalRouter.post('/proposals/from-package', requireAuth, createProposalFromPackage)
customerProposalRouter.post('/proposals/:code/accept', requireAuth, acceptProposal)
customerProposalRouter.get('/proposals/:code/invoice', requireAuth, getInvoiceForProposal)
customerProposalRouter.get('/proposals/:code/pdf', requireAuth, getProposalPdf)

export const adminProposalRouter = Router()
adminProposalRouter.get('/proposals', requireAdmin, requireDivision('digital', 'print'), listProposals)
adminProposalRouter.post('/proposals', requireAdmin, requireDivision('digital', 'print'), createProposal)
adminProposalRouter.get('/proposals/:code', requireAdmin, requireDivision('digital', 'print'), getProposal)
adminProposalRouter.patch('/proposals/:code', requireAdmin, requireDivision('digital', 'print'), updateProposal)
adminProposalRouter.patch('/proposals/:code/send', requireAdmin, requireDivision('digital', 'print'), sendProposal)
