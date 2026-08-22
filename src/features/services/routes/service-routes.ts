import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  listServices,
  createService,
  getService,
  updateService,
} from '../controllers/service-controller'

export const adminServiceRouter = Router()
adminServiceRouter.get('/services', requireAdmin, requireDivision('digital', 'print'), listServices)
adminServiceRouter.post('/services', requireAdmin, requireDivision('digital', 'print'), createService)
adminServiceRouter.get('/services/:code', requireAdmin, requireDivision('digital', 'print'), getService)
adminServiceRouter.patch('/services/:code', requireAdmin, requireDivision('digital', 'print'), updateService)
