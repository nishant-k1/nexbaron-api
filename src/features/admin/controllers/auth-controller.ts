import { Request, Response, NextFunction } from 'express'
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
} from '../services/auth-service'
import {
  setAuthCookies,
  clearAuthCookies,
  readRefreshCookie,
} from '../services/cookie-service'
import { hashToken } from '../services/token-service'
import { getDivisionModels } from '../../../models/registry'
import type { StaffRole, StaffDivision } from '../../../models/staff.model'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['owner', 'admin', 'staff']).default('staff'),
})

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
  active: z.boolean().optional(),
})

const resetPasswordSchema = z.object({
  password: z.string().min(8),
})

function canCreateRole(callerRole: StaffRole, targetRole: StaffRole): boolean {
  if (callerRole === 'owner') return true
  if (callerRole === 'admin') return targetRole === 'staff'
  return false
}

function canEditTarget(callerRole: StaffRole, currentRole: StaffRole, nextRole = currentRole): boolean {
  if (callerRole === 'owner') return true
  return callerRole === 'admin' && currentRole === 'staff' && nextRole === 'staff'
}

export async function login(req: Request, res: Response, next: NextFunction) {
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
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshTokenCookie = readRefreshCookie(req)
    if (!refreshTokenCookie) {
      res.status(401).json({ success: false, message: 'No refresh token' })
      return
    }
    const staff = await getStaffByRefreshToken(refreshTokenCookie)
    if (!staff) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' })
      return
    }
    const nextTokens = await rotateRefreshToken(staff, hashToken(refreshTokenCookie))
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
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshTokenCookie = readRefreshCookie(req)
    if (refreshTokenCookie) {
      const staff = await getStaffByRefreshToken(refreshTokenCookie)
      if (staff) await revokeRefreshToken(refreshTokenCookie, staff.division)
    }
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req: Request, res: Response) {
  const { Staff } = getDivisionModels(req.staffAuth!.division)
  const staff = await Staff.findById(req.staffAuth!.id)
  if (!staff || !staff.active) {
    clearAuthCookies(res)
    res.status(401).json({ success: false, message: 'Account unavailable' })
    return
  }
  res.json({ success: true, staff: getPublicStaff(staff) })
}

export async function listStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { Staff } = getDivisionModels(req.staffAuth!.division)
    const staff = await Staff.find({ division: req.staffAuth!.division }).sort({ createdAt: 1 })
    res.json({ success: true, staff: staff.map(getPublicStaff) })
  } catch (err) {
    next(err)
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const caller = req.staffAuth!
    const parsed = createStaffSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, message: 'Invalid staff details' })
      return
    }
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
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
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
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction) {
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
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
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
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    await revokeAllForStaff(req.staffAuth!.id, req.staffAuth!.division)
    clearAuthCookies(res)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
