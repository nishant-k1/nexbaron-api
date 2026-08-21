import { Request, Response } from 'express'
import * as Sentry from '@sentry/node'
import { logger } from './logger'
import { sanitize } from './sanitize'
import { isSentryEnabled } from './sentry'
import { runtimeBrand } from '../config/brand'

export function handleError(
  operation: string,
  req: Request,
  res: Response,
  error: unknown,
  fallbackMessage = 'Something went wrong'
): void {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error')
  const status = typeof (err as { status?: number }).status === 'number' ? (err as { status?: number }).status! : 500
  const isOperational = (err as { isOperational?: boolean }).isOperational === true || status < 500
  const requestId = (req as { requestId?: string }).requestId
  const division = (req as { division?: string }).division ?? runtimeBrand
  const log = ((req as { logger?: typeof logger }).logger as typeof logger) ?? logger

  log[isOperational ? 'warn' : 'error'](
    {
      err,
      operation,
      requestId,
      division,
      path: req.path,
      method: req.method,
      body: sanitize(req.body),
    },
    `${operation} failed`
  )

  if (isSentryEnabled()) {
    Sentry.captureException(err, {
      tags: { operation, division, requestId },
      extra: { path: req.path, method: req.method, body: sanitize(req.body) },
    })
  }

  const message =
    process.env.NODE_ENV === 'production' && !isOperational
      ? fallbackMessage
      : isOperational
        ? err.message
        : `${fallbackMessage}: ${err.message}`

  res.status(status).json({ success: false, message })
}
