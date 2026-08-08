import { Request } from 'express'

// Express 5 types route params as `string | string[]`. Our routes only use
// simple `:name` captures (never wildcards), so params are always strings at
// runtime; this narrows them safely.
export function stringParam(req: Request, name: string): string | undefined {
  const value = req.params[name]
  return typeof value === 'string' ? value : undefined
}