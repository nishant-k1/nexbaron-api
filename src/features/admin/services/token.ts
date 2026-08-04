import crypto from 'crypto'

const ACCESS_TTL = 60 * 15 // 15 minutes
const REFRESH_TTL_DAYS = 30

export interface AdminTokenPayload {
  sub: string
  role: 'admin' | 'staff'
  division: 'digital' | 'print' | 'both'
  name: string
  iat: number
  exp: number
}

function secret(): string {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'nexbaron-admin-dev-secret'
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function sign(data: string): string {
  return base64url(crypto.createHmac('sha256', secret()).update(data).digest())
}

function create(payload: {
  sub: string
  role: 'admin' | 'staff'
  division: 'digital' | 'print' | 'both'
  name: string
  ttlSeconds: number
}): string {
  const now = Math.floor(Date.now() / 1000)
  const claims: AdminTokenPayload = {
    sub: payload.sub,
    role: payload.role,
    division: payload.division,
    name: payload.name,
    exp: now + payload.ttlSeconds,
    iat: now,
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(claims))
  const signature = sign(`${header}.${body}`)
  return `${header}.${body}.${signature}`
}

export function createAccessToken(p: {
  sub: string
  role: 'admin' | 'staff'
  division: 'digital' | 'print' | 'both'
  name: string
}): string {
  return create({ ...p, ttlSeconds: ACCESS_TTL })
}

export function createRefreshToken(p: {
  sub: string
  role: 'admin' | 'staff'
  division: 'digital' | 'print' | 'both'
  name: string
}): string {
  return create({ ...p, ttlSeconds: REFRESH_TTL_DAYS * 24 * 60 * 60 })
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    const expected = sign(`${header}.${body}`)
    if (signature !== expected) return null
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminTokenPayload
    if (claims.exp && claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const ACCESS_TOKEN_TTL_MS = ACCESS_TTL * 1000
export const REFRESH_TOKEN_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000