import { Router } from 'express'
import { requireAuth } from '../../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  getMyPackages,
  listPackages,
  createPackage,
  getPackage,
  updatePackage,
  updateDeliveryStatus,
  assignServiceToPackage,
  removeServiceFromPackage,
  reconcilePackageServices,
} from '../controllers/package-controller'

export const customerPackageRouter = Router()
customerPackageRouter.get('/packages', requireAuth, getMyPackages)

export const adminPackageRouter = Router()
adminPackageRouter.get('/packages', requireAdmin, requireDivision('digital', 'print'), listPackages)
adminPackageRouter.post('/packages', requireAdmin, requireDivision('digital', 'print'), createPackage)
adminPackageRouter.get('/packages/:code', requireAdmin, requireDivision('digital', 'print'), getPackage)
adminPackageRouter.patch('/packages/:code', requireAdmin, requireDivision('digital', 'print'), updatePackage)
adminPackageRouter.patch('/packages/:code/status', requireAdmin, requireDivision('digital', 'print'), updateDeliveryStatus)
adminPackageRouter.post('/packages/:code/services', requireAdmin, requireDivision('digital', 'print'), assignServiceToPackage)
adminPackageRouter.put('/packages/:code/services', requireAdmin, requireDivision('digital', 'print'), reconcilePackageServices)
adminPackageRouter.delete('/packages/:code/services/:serviceCode', requireAdmin, requireDivision('digital', 'print'), removeServiceFromPackage)
