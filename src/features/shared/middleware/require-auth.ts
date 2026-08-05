import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from './jwt'

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
  const token = header?.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined)

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
  req.division = payload.division
  next()
}