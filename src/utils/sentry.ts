import * as Sentry from '@sentry/node'

let enabled = false

export function isSentryEnabled(): boolean {
  return enabled
}

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    // Graceful degrade: no Sentry account configured. The app logs locally via pino.
    return
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: process.env.SENTRY_RELEASE,
  })
  enabled = true
}
