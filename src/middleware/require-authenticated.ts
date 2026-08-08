import { Request, Response } from 'express'

export function requireAuthenticated(req: Request, res: Response): boolean {
  if (!req.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' })
    return false
  }
  return true
}