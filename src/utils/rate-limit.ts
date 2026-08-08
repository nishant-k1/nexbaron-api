import { Request, Response, NextFunction } from 'express'

interface Bucket {
  count: number
  resetAt: number
}

const MAX_BUCKETS = 5000
const buckets = new Map<string, Bucket>()

function cleanup(): void {
  if (buckets.size <= MAX_BUCKETS) return
  const keys = buckets.keys()
  let removed = 0
  while (removed < 256) {
    const { value, done } = keys.next()
    if (done || value === undefined) break
    buckets.delete(value)
    removed += 1
  }
}

export interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
}

export function rateLimit(opts: RateLimitOptions) {
  const { windowMs, max } = opts
  const message = opts.message || 'Too many requests. Please try again later.'
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const key = `${req.path}:${ip}`
    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > max) {
      res.status(429).json({ success: false, message })
      return
    }
    cleanup()
    next()
  }
}