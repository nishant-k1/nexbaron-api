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
customerPackageRouter.get('/plans', requireAuth, getMyPackages)

export const adminPackageRouter = Router()
// Canonical: /plans (alias: /packages for backwards compat)
adminPackageRouter.get('/plans', requireAdmin, requireDivision('digital', 'print'), listPackages)
adminPackageRouter.get('/packages', requireAdmin, requireDivision('digital', 'print'), listPackages)
adminPackageRouter.post('/plans', requireAdmin, requireDivision('digital', 'print'), createPackage)
adminPackageRouter.post('/packages', requireAdmin, requireDivision('digital', 'print'), createPackage)
adminPackageRouter.get('/plans/:code', requireAdmin, requireDivision('digital', 'print'), getPackage)
adminPackageRouter.get('/packages/:code', requireAdmin, requireDivision('digital', 'print'), getPackage)
adminPackageRouter.patch('/plans/:code', requireAdmin, requireDivision('digital', 'print'), updatePackage)
adminPackageRouter.patch('/packages/:code', requireAdmin, requireDivision('digital', 'print'), updatePackage)
adminPackageRouter.patch('/plans/:code/status', requireAdmin, requireDivision('digital', 'print'), updateDeliveryStatus)
adminPackageRouter.patch('/packages/:code/status', requireAdmin, requireDivision('digital', 'print'), updateDeliveryStatus)
adminPackageRouter.post('/plans/:code/services', requireAdmin, requireDivision('digital', 'print'), assignServiceToPackage)
adminPackageRouter.post('/packages/:code/services', requireAdmin, requireDivision('digital', 'print'), assignServiceToPackage)
adminPackageRouter.put('/plans/:code/services', requireAdmin, requireDivision('digital', 'print'), reconcilePackageServices)
adminPackageRouter.put('/packages/:code/services', requireAdmin, requireDivision('digital', 'print'), reconcilePackageServices)
adminPackageRouter.delete('/plans/:code/services/:serviceCode', requireAdmin, requireDivision('digital', 'print'), removeServiceFromPackage)
adminPackageRouter.delete('/packages/:code/services/:serviceCode', requireAdmin, requireDivision('digital', 'print'), removeServiceFromPackage)
