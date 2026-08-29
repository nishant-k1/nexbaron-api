import { Response, Request } from 'express'
import { runtimeBrand } from '../../../config/brand'

const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7

function cookieName(): string {
  return `nexbaron_token_${runtimeBrand}`
}

export function setCustomerCookie(res: Response, token: string): void {
  const sameSite: 'lax' | 'none' = COOKIE_DOMAIN ? 'none' : 'lax'
  res.cookie(cookieName(), token, {
    httpOnly: true,
    secure: IS_PROD || !!COOKIE_DOMAIN,
    sameSite,
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: EXPIRES_IN * 1000,
  })
}

export function clearCustomerCookie(res: Response): void {
  const sameSite: 'lax' | 'none' = COOKIE_DOMAIN ? 'none' : 'lax'
  res.clearCookie(cookieName(), { path: '/', domain: COOKIE_DOMAIN, sameSite })
}

export function readCustomerCookie(req: Request): string | undefined {
  const name = cookieName()
  return (req as any).cookies?.[name] as string | undefined
}
