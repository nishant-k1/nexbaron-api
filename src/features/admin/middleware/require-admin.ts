import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/token'
import { readAccessCookie } from '../services/cookies'

declare global {
  namespace Express {
    interface Request {
      staffAuth?: {
        id: string
        role: 'admin' | 'staff'
        division: 'digital' | 'print' | 'both'
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

export function requireRole(...roles: Array<'admin' | 'staff'>) {
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

export function requireDivision(...divisions: Array<'digital' | 'print'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { division } = req.staffAuth
    const staffDivisions = division === 'both' ? ['digital', 'print'] : [division]
    if (!divisions.some((d) => staffDivisions.includes(d))) {
      res.status(403).json({ success: false, message: 'Not authorized for this division' })
      return
    }
    next()
  }
}