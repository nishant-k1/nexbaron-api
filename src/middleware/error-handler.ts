import { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import { logger } from '../utils/logger'
import { sanitize } from '../utils/sanitize'
import { isSentryEnabled } from '../utils/sentry'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as { requestId?: string }).requestId
  const division = (req as { division?: string }).division
  const log = (req as { logger?: typeof logger }).logger ?? logger

  log.error(
    {
      err,
      requestId,
      division,
      path: req.path,
      method: req.method,
      body: sanitize(req.body),
    },
    'Unhandled error'
  )

  if (isSentryEnabled()) {
    Sentry.captureException(err, {
      tags: { division, requestId },
      extra: { path: req.path, method: req.method },
    })
  }

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error'

  res.status(500).json({ success: false, message, ...(requestId ? { requestId } : {}) })
}
