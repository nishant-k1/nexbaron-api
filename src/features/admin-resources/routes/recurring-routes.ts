import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { getRecurring, postRecurring, patchRecurring } from '../controllers/admin-resources-controller'

export const adminRecurringRouter = Router()

adminRecurringRouter.get('/recurring', requireAdmin, requireDivision('digital', 'print'), getRecurring)
adminRecurringRouter.post('/recurring', requireAdmin, requireDivision('digital', 'print'), postRecurring)
adminRecurringRouter.patch('/recurring/:id', requireAdmin, requireDivision('digital', 'print'), patchRecurring)
