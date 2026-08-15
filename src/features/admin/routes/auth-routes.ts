import { Router } from 'express'
import { z } from 'zod'
import {
  validateCredentials,
  issueTokens,
  persistRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForStaff,
  getStaffByRefreshToken,
  getPublicStaff,
  hashPassword,
} from '../services/index'
import { requireAdmin, requireRole } from '../middleware/require-admin'
import {
  setAuthCookies,
  clearAuthCookies,
  readRefreshCookie,
} from '../services/cookies'
import { hashToken } from '../services/token'
import { getDivisionModels } from '../../../models/registry'
import type { StaffRole, StaffDivision } from '../../../models/staff.model'
import { rateLimit } from '../../../utils/rate-limit'

export const adminAuthRouter: Router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many login attempts. Try again later.' })

adminAuthRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid email or password format' })
      return
    }
    const staff = await validateCredentials(parsed.data.email, parsed.data.password)
    if (!staff) {
      res.status(401).json({ success: false, message: 'Invalid credentials' })
      return
    }
    const tokens = issueTokens(staff)
    await persistRefreshToken(staff._id.toString(), tokens.refresh, staff.division)
    setAuthCookies(res, tokens)
    res.json({ success: true, staff: getPublicStaff(staff) })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/refresh', async (req, res, next) => {
  try {
    const refresh = readRefreshCookie(req)
    if (!refresh) {
      res.status(401).json({ success: false, message: 'No refresh token' })
      return
    }
    const staff = await getStaffByRefreshToken(refresh)
    if (!staff) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' })
      return
    }
    const nextTokens = await rotateRefreshToken(staff, hashToken(refresh))
    if (!nextTokens) {
      clearAuthCookies(res)
      res.status(401).json({ success: false, message: 'Session expired' })
      return
    }
    setAuthCookies(res, nextTokens)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/logout', async (req, res, next) => {
  try {
    const refresh = readRefreshCookie(req)
    if (refresh) {
      const staff = await getStaffByRefreshToken(refresh)
      if (staff) await revokeRefreshToken(refresh, staff.division)
    }
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.get('/me', requireAdmin, async (req, res) => {
  const { Staff } = getDivisionModels(req.staffAuth!.division)
  const staff = await Staff.findById(req.staffAuth!.id)
  if (!staff || !staff.active) {
    clearAuthCookies(res)
    res.status(401).json({ success: false, message: 'Account unavailable' })
    return
  }
  res.json({ success: true, staff: getPublicStaff(staff) })
})

// ---- Admin-only: staff management ----
// Rules:
//  - Every endpoint is scoped to the caller's division (no cross-business access).
//  - owner: can list/modify all in-division accounts.
//  - admin: can list, and can modify staff (not other admins/owners, cannot self-modify).

function canCreateRole(callerRole: StaffRole, targetRole: StaffRole): boolean {
  if (callerRole === 'owner') return true
  if (callerRole === 'admin') return targetRole === 'staff'
  return false
}

function canEditTarget(callerRole: StaffRole, currentRole: StaffRole, nextRole = currentRole): boolean {
  if (callerRole === 'owner') return true
  return callerRole === 'admin' && currentRole === 'staff' && nextRole === 'staff'
}

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['owner', 'admin', 'staff']).default('staff'),
})

adminAuthRouter.get('/staff', requireAdmin, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const { Staff } = getDivisionModels(req.staffAuth!.division)
    const staff = await Staff.find({ division: req.staffAuth!.division }).sort({ createdAt: 1 })
    res.json({ success: true, staff: staff.map(getPublicStaff) })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/staff', requireAdmin, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const caller = req.staffAuth!
    const parsed = createStaffSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid staff details' })
      return
    }
    // Only owner may create admins or owners; admins may only create staff.
    if (!canCreateRole(caller.role, parsed.data.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions to create this role' })
      return
    }
    const division: StaffDivision = caller.division
    const { Staff } = getDivisionModels(division)
    const existing = await Staff.findOne({ email: parsed.data.email.toLowerCase().trim() })
    if (existing) {
      res.status(409).json({ success: false, message: 'A staff member with this email already exists' })
      return
    }
    const staff = await Staff.create({
      email: parsed.data.email.toLowerCase().trim(),
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name.trim(),
      role: parsed.data.role,
      division,
    })
    res.status(201).json({ success: true, staff: getPublicStaff(staff) })
  } catch (err) {
    next(err)
  }
})

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
  active: z.boolean().optional(),
})

adminAuthRouter.patch('/staff/:id', requireAdmin, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const caller = req.staffAuth!
    if (req.params.id === caller.id) {
      res.status(400).json({ success: false, message: 'You cannot modify your own account here' })
      return
    }
    const { Staff } = getDivisionModels(caller.division)
    const target = await Staff.findById(req.params.id)
    if (!target || target.division !== caller.division) {
      res.status(404).json({ success: false, message: 'Staff member not found' })
      return
    }
    const parsed = updateStaffSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid staff details' })
      return
    }
    const data = parsed.data
    const newRole = data.role ?? target.role
    if (!canEditTarget(caller.role, target.role, newRole)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions for this change' })
      return
    }
    if (data.name !== undefined) target.name = data.name.trim()
    if (data.email !== undefined) target.email = data.email.toLowerCase().trim()
    if (data.role !== undefined) target.role = data.role
    if (data.active !== undefined) {
      if (target.active && !data.active) await revokeAllForStaff(target._id.toString(), caller.division)
      target.active = data.active
    }
    await target.save()
    res.json({ success: true, staff: getPublicStaff(target) })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.delete('/staff/:id', requireAdmin, requireRole('owner'), async (req, res, next) => {
  try {
    const caller = req.staffAuth!
    if (req.params.id === caller.id) {
      res.status(400).json({ success: false, message: 'You cannot deactivate your own account' })
      return
    }
    const { Staff } = getDivisionModels(caller.division)
    const target = await Staff.findById(req.params.id)
    if (!target || target.division !== caller.division) {
      res.status(404).json({ success: false, message: 'Staff member not found' })
      return
    }
    await revokeAllForStaff(target._id.toString(), caller.division)
    target.active = false
    await target.save()
    res.json({ success: true, staff: getPublicStaff(target) })
  } catch (err) {
    next(err)
  }
})

const resetPasswordSchema = z.object({
  password: z.string().min(8),
})

adminAuthRouter.post('/staff/:id/reset-password', requireAdmin, requireRole('owner', 'admin'), async (req, res, next) => {
  try {
    const caller = req.staffAuth!
    const { Staff } = getDivisionModels(caller.division)
    const target = await Staff.findById(req.params.id)
    if (!target || target.division !== caller.division) {
      res.status(404).json({ success: false, message: 'Staff member not found' })
      return
    }
    if (!canEditTarget(caller.role, target.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' })
      return
    }
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' })
      return
    }
    target.passwordHash = await hashPassword(parsed.data.password)
    await target.save()
    await revokeAllForStaff(target._id.toString(), caller.division)
    res.json({ success: true, message: 'Password reset' })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/logout-all', requireAdmin, async (req, res, next) => {
  try {
    await revokeAllForStaff(req.staffAuth!.id, req.staffAuth!.division)
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})
