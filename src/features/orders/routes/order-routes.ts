import { Router } from 'express'
import { requireAdmin } from '../../admin/middleware/require-admin'
import { listOrders, recordPaymentFromLead, updateOrderStatus } from '../controllers/order-controller'

export const adminOrderRouter = Router()

// All order/customer routes require staff admin auth (httpOnly cookies).
adminOrderRouter.get('/orders', requireAdmin, listOrders)
adminOrderRouter.post('/orders/pay', requireAdmin, recordPaymentFromLead)
adminOrderRouter.patch('/orders/:id/status', requireAdmin, updateOrderStatus)