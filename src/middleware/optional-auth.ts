import { Request, Response, NextFunction } from 'express'
import { verifyToken } from './jwt'
import { runtimeBrand } from '../config/brand'

/**
 * Optional auth — parses the JWT if present but allows unauthenticated access.
 * Sets req.userId/req.auth/req.division only when a valid token is provided.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    next()
    return
  }
  const token = header.slice(7)
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
