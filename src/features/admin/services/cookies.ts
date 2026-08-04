import { Response } from 'express'
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from './token'

const IS_PROD = process.env.NODE_ENV === 'production'

const ACCESS_COOKIE = 'admin_access'
const REFRESH_COOKIE = 'admin_refresh'

export interface AuthCookies {
  access: string
  refresh: string
}

export function setAuthCookies(res: Response, tokens: AuthCookies): void {
  res.cookie(ACCESS_COOKIE, tokens.access, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  })
  res.cookie(REFRESH_COOKIE, tokens.refresh, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_MS,
  })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' })
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
}

export function readAccessCookie(req: { cookies?: Record<string, string> }): string | undefined {
  return req.cookies?.[ACCESS_COOKIE]
}

export function readRefreshCookie(req: { cookies?: Record<string, string> }): string | undefined {
  return req.cookies?.[REFRESH_COOKIE]
}