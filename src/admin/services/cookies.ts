import { Response } from 'express'
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from './token'
import { runtimeBrand } from '../../utils/runtime-brand'

const IS_PROD = process.env.NODE_ENV === 'production'

const ACCESS_COOKIE = `admin_access_${runtimeBrand}`
const REFRESH_COOKIE = `admin_refresh_${runtimeBrand}`
const COOKIE_PATH = '/'
// When set (e.g. ".nexbaron.com"), the admin cookie is shared across all
// subdomains — required so the dedicated chat service can authenticate staff.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined

export interface AuthCookies {
  access: string
  refresh: string
}

export function setAuthCookies(res: Response, tokens: AuthCookies): void {
  res.cookie(ACCESS_COOKIE, tokens.access, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: COOKIE_PATH,
    domain: COOKIE_DOMAIN,
    maxAge: ACCESS_TOKEN_TTL_MS,
  })
  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: COOKIE_PATH,
    domain: COOKIE_DOMAIN,
    maxAge: REFRESH_TOKEN_TTL_MS,
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: COOKIE_PATH, domain: COOKIE_DOMAIN })
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH, domain: COOKIE_DOMAIN })
}

export function readAccessCookie(req: { cookies?: Record<string, string> }): string | undefined {
  return req.cookies?.[ACCESS_COOKIE]
}

export function readRefreshCookie(req: { cookies?: Record<string, string> }): string | undefined {
  return req.cookies?.[REFRESH_COOKIE]
}
