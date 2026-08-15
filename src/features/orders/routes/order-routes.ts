import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { listOrders, recordPaymentFromLead, updateOrderStatus, createProjectFromClient } from '../controllers/order-controller'

export const adminOrderRouter = Router()

// All order/customer routes require staff admin auth (httpOnly cookies).
adminOrderRouter.get('/orders', requireAdmin, requireDivision('digital', 'print'), listOrders)
adminOrderRouter.post('/orders/pay', requireAdmin, requireDivision('digital', 'print'), recordPaymentFromLead)
adminOrderRouter.post('/orders/create-project', requireAdmin, requireDivision('digital', 'print'), createProjectFromClient)
adminOrderRouter.patch('/orders/:id/status', requireAdmin, requireDivision('digital', 'print'), updateOrderStatus)