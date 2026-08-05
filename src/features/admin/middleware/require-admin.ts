import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/token'
import { readAccessCookie } from '../services/cookies'
import type { StaffRole, StaffDivision } from '../models/staff.model'

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

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
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
  req.staffAuth = {
    id: payload.sub,
    role: payload.role,
    division: payload.division,
    name: payload.name,
  }
  next()
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

export function requireAnyDivision(req: Request, res: Response, next: NextFunction): void {
  if (!req.staffAuth) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }
  next()
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