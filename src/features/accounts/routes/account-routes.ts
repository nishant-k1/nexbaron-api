import { Router } from 'express'
import { requireAuth } from '../../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  getMyAccount,
  listAccounts,
  getAccount,
  createAccount,
  advanceStage,
} from '../controllers/account-controller'

export const customerAccountRouter = Router()
customerAccountRouter.get('/account', requireAuth, getMyAccount)

export const adminAccountRouter = Router()
adminAccountRouter.get('/accounts', requireAdmin, requireDivision('digital', 'print'), listAccounts)
adminAccountRouter.post('/accounts', requireAdmin, requireDivision('digital', 'print'), createAccount)
adminAccountRouter.get('/accounts/:code', requireAdmin, requireDivision('digital', 'print'), getAccount)
adminAccountRouter.patch('/accounts/:code/stage', requireAdmin, requireDivision('digital', 'print'), advanceStage)
