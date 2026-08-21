import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as { requestId?: string }).requestId
  const log = (req as { logger?: typeof logger }).logger ?? logger
  log.warn({ requestId, path: req.path, method: req.method }, 'Route not found')
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    ...(requestId ? { requestId } : {}),
  })
}
