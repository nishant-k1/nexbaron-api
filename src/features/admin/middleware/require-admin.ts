import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/token-service'
import { readAccessCookie } from '../services/cookie-service'
import type { StaffRole, StaffDivision } from '../../../models/staff.model'
import { runtimeBrand } from '../../../config/brand'
import { getDivisionModels } from '../../../models/registry'

declare global {
  namespace Express {
    interface Request {
      staffAuth?: {
        id: string
        role: StaffRole
        division: StaffDivision
        name: string
      }
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readAccessCookie(req)
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, message: 'Invalid or expired session' })
    return
  }
  try {
    const { Staff } = getDivisionModels(runtimeBrand)
    const staff = await Staff.findOne({ _id: payload.sub, division: runtimeBrand, active: true })
    if (!staff) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }
    req.staffAuth = {
      id: staff._id.toString(),
      role: staff.role,
      division: runtimeBrand,
      name: staff.name,
    }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid session account' })
  }
}

export function requireRole(...roles: Array<StaffRole>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    if (!roles.includes(req.staffAuth.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export function requireDivision(...divisions: Array<StaffDivision>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { division } = req.staffAuth
    if (!divisions.includes(division)) {
      res.status(403).json({ success: false, message: 'Not authorized for this division' })
      return
    }
    next()
  }
}
