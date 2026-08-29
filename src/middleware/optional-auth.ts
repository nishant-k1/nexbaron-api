import { Request, Response, NextFunction } from 'express'
import { verifyToken } from './jwt'
import { runtimeBrand } from '../config/brand'

/**
 * Optional auth — parses the JWT if present but allows unauthenticated access.
 * Sets req.userId/req.auth/req.division only when a valid token is provided.
 */
function extractTokenOptional(req: Request): string | undefined {
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

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractTokenOptional(req)
  if (!token) {
    next()
    return
  }
  const payload = verifyToken(token)
  if (!payload || payload.division !== runtimeBrand) {
    next()
    return
  }
  req.userId = payload.sub
  req.auth = payload
  req.division = runtimeBrand
  next()
}
