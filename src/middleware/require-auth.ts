import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from './jwt'
import { runtimeBrand } from '../config/brand'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      auth?: TokenPayload
      division?: 'digital' | 'print'
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const t = header.slice(7).trim()
    if (t) return t
  }
  const cookieName = `nexbaron_token_${runtimeBrand}`
  const fromCookie = (req as any).cookies?.[cookieName] as string | undefined
  if (fromCookie?.trim()) return fromCookie.trim()
  return undefined
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)

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
