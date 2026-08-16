import { Router } from 'express'
import {
  login,
  refresh,
  logout,
  getMe,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetPassword,
  logoutAll,
} from '../controllers/auth-controller'
import { requireAdmin, requireRole } from '../middleware/require-admin'
import { rateLimit } from '../../../utils/rate-limit'

export const adminAuthRouter: Router = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts. Try again later.' })

adminAuthRouter.post('/login', loginLimiter, login)
adminAuthRouter.post('/refresh', refresh)
adminAuthRouter.post('/logout', logout)
adminAuthRouter.get('/me', requireAdmin, getMe)
adminAuthRouter.get('/staff', requireAdmin, requireRole('owner', 'admin'), listStaff)
adminAuthRouter.post('/staff', requireAdmin, requireRole('owner', 'admin'), createStaff)
adminAuthRouter.patch('/staff/:id', requireAdmin, requireRole('owner', 'admin'), updateStaff)
adminAuthRouter.delete('/staff/:id', requireAdmin, requireRole('owner'), deleteStaff)
adminAuthRouter.post('/staff/:id/reset-password', requireAdmin, requireRole('owner', 'admin'), resetPassword)
adminAuthRouter.post('/logout-all', requireAdmin, logoutAll)
