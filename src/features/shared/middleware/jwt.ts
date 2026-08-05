import crypto from 'crypto'
import { runtimeBrand } from '../../../utils/runtime-brand'

const EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7
const DEV_SECRET = 'nexbaron-dev-secret'

function secret(): string {
  const configured = process.env[`JWT_SECRET_${runtimeBrand.toUpperCase()}`] ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32 || configured === DEV_SECRET || configured === 'change-me')) {
    throw new Error('A strong JWT_SECRET is required in production')
  }
  return configured || DEV_SECRET
}

if (process.env.NODE_ENV === 'production') secret()

export interface TokenPayload {
  sub: string
  division: 'digital' | 'print'
  name?: string
  iat: number
  exp: number
}

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

export function createToken(payload: { sub: string; division: 'digital' | 'print'; name?: string }): string {
  if (payload.division !== runtimeBrand) throw new Error('Cannot issue a token for another brand')
  const now = Math.floor(Date.now() / 1000)
  const claims: TokenPayload = {
    sub: payload.sub,
    division: payload.division,
    name: payload.name || '',
    exp: now + EXPIRES_IN,
    iat: now,
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(claims))
  const signature = base64url(sign(`${header}.${body}`))
  return `${header}.${body}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
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
    if (claims.name !== undefined && typeof claims.name !== 'string') return null
    return claims as unknown as TokenPayload
  } catch {
    return null
  }
}
