import { Router } from 'express'
import { z } from 'zod'
import {
  Staff,
  validateCredentials,
  issueTokens,
  persistRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForStaff,
  getStaffByRefreshToken,
  getPublicStaff,
  hashPassword,
} from '../services'
import { requireAdmin, requireRole } from '../middleware/require-admin'
import {
  setAuthCookies,
  clearAuthCookies,
  readRefreshCookie,
} from '../services/cookies'
import { hashToken } from '../services/token'

export const adminAuthRouter: Router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

adminAuthRouter.post('/login', async (req, res, next) => {
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
    await persistRefreshToken(staff._id.toString(), tokens.refresh)
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
    const nextTokens = await rotateRefreshToken(staff, refresh, hashToken(refresh))
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
    if (refresh) await revokeRefreshToken(refresh)
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.get('/me', requireAdmin, async (req, res) => {
  const staff = await Staff.findById(req.staffAuth!.id)
  if (!staff || !staff.active) {
    clearAuthCookies(res)
    res.status(401).json({ success: false, message: 'Account unavailable' })
    return
  }
  res.json({ success: true, staff: getPublicStaff(staff) })
})

// ---- Admin-only: staff management ----
const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['admin', 'staff']).default('staff'),
  division: z.enum(['digital', 'print', 'both']).default('both'),
})

adminAuthRouter.post('/staff', requireAdmin, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = createStaffSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid staff details' })
      return
    }
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
      division: parsed.data.division,
    })
    res.status(201).json({ success: true, staff: getPublicStaff(staff) })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.post('/logout-all', requireAdmin, async (req, res, next) => {
  try {
    await revokeAllForStaff(req.staffAuth!.id)
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

adminAuthRouter.get('/staff', requireAdmin, requireRole('admin'), async (req, res, next) => {
  try {
    const staff = await Staff.find({}).sort({ createdAt: 1 })
    res.json({ success: true, staff: staff.map(getPublicStaff) })
  } catch (err) {
    next(err)
  }
})