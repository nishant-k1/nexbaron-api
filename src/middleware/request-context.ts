import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import * as Sentry from '@sentry/node'
import { logger } from '../utils/logger'
import { isSentryEnabled } from '../utils/sentry'

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
  ;(req as { requestId?: string }).requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  const division = (req as { division?: string }).division
  ;(req as { logger?: ReturnType<typeof logger.child> }).logger = logger.child({
    requestId,
    division,
    path: req.path,
    method: req.method,
  })

  if (isSentryEnabled()) {
    Sentry.setTag('requestId', requestId)
  }

  next()
}
