import crypto from 'crypto'

const SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'nexbaron-dev-secret'
const EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN_SECONDS) || 60 * 60 * 24 * 7

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

function sign(data: string): string {
  return base64url(crypto.createHmac('sha256', SECRET).update(data).digest())
}

export function createToken(payload: { sub: string; division: string; name?: string }): string {
  const now = Math.floor(Date.now() / 1000)
  const claims: TokenPayload = {
    sub: payload.sub,
    division: (payload.division as 'digital' | 'print') || 'digital',
    name: payload.name || '',
    exp: now + EXPIRES_IN,
    iat: now,
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(claims))
  const signature = sign(`${header}.${body}`)
  return `${header}.${body}.${signature}`
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    const expected = sign(`${header}.${body}`)
    if (signature !== expected) return null
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if (claims.exp && claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}