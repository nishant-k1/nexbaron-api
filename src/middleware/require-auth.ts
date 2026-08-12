import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from './jwt'
import { runtimeBrand } from '../utils/runtime-brand'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      auth?: TokenPayload
      division?: 'digital' | 'print'
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
    return
  }

  req.userId = payload.sub
  req.auth = payload
  req.division = runtimeBrand
  next()
}

// Like requireAuth, but does not reject unauthenticated requests. Used for
// public endpoints (e.g. quote submission) that optionally link a record to
// the signed-in account when a valid token is present.
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined

  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      req.userId = payload.sub
      req.auth = payload
      req.division = runtimeBrand
    }
  }

  next()
}
