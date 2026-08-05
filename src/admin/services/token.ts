import crypto from 'crypto'
import type { StaffRole, StaffDivision } from '../models/staff.model'
import { runtimeBrand } from '../../utils/runtime-brand'

const ACCESS_TTL = 60 * 15 // 15 minutes
const REFRESH_TTL_DAYS = 30
const DEV_SECRET = 'nexbaron-admin-dev-secret'

export interface AdminTokenPayload {
  sub: string
  role: StaffRole
  division: StaffDivision
  name: string
  iat: number
  exp: number
}

function secret(): string {
  const adminSecret = process.env[`ADMIN_JWT_SECRET_${runtimeBrand.toUpperCase()}`]
  const customerSecret = process.env[`JWT_SECRET_${runtimeBrand.toUpperCase()}`]
  const configured = adminSecret ||
    customerSecret
  if (process.env.NODE_ENV === 'production' && (
    !adminSecret || adminSecret.length < 32 || adminSecret === customerSecret ||
    adminSecret === DEV_SECRET || adminSecret === 'change-me' || adminSecret === 'change-me-separately'
  )) {
    throw new Error('A strong ADMIN_JWT_SECRET is required in production')
  }
  return configured || DEV_SECRET
}

if (process.env.NODE_ENV === 'production') secret()

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function sign(data: string): Buffer {
  return crypto.createHmac('sha256', secret()).update(data).digest()
}

function create(payload: {
  sub: string
  role: StaffRole
  division: StaffDivision
  name: string
  ttlSeconds: number
}): string {
  if (payload.division !== runtimeBrand) throw new Error('Cannot issue an admin token for another brand')
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
  const signature = base64url(sign(`${header}.${body}`))
  return `${header}.${body}.${signature}`
}

export function createAccessToken(p: {
  sub: string
  role: StaffRole
  division: StaffDivision
  name: string
}): string {
  return create({ ...p, ttlSeconds: ACCESS_TTL })
}

export function createRefreshToken(p: {
  sub: string
  role: StaffRole
  division: StaffDivision
  name: string
}): string {
  return create({ ...p, ttlSeconds: REFRESH_TTL_DAYS * 24 * 60 * 60 })
}

export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, body, signature] = parts
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString()) as Record<string, unknown>
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null
    const expected = sign(`${encodedHeader}.${body}`)
    const supplied = Buffer.from(signature, 'base64url')
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as Record<string, unknown>
    if (typeof claims.sub !== 'string' || !claims.sub.trim()) return null
    if (typeof claims.iat !== 'number' || !Number.isInteger(claims.iat)) return null
    if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp)) return null
    const now = Math.floor(Date.now() / 1000)
    if (claims.iat > now + 60 || claims.exp <= now || claims.exp <= claims.iat) return null
    if (claims.division !== runtimeBrand) return null
    if (claims.role !== 'owner' && claims.role !== 'admin' && claims.role !== 'staff') return null
    if (typeof claims.name !== 'string') return null
    return claims as unknown as AdminTokenPayload
  } catch {
    return null
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const ACCESS_TOKEN_TTL_MS = ACCESS_TTL * 1000
export const REFRESH_TOKEN_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
