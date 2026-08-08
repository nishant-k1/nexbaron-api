import crypto from 'crypto'

export function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function hmacSha256(data: string, secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest()
}

export function timingSafeEqualHex(expectedHex: string, suppliedHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex')
  const supplied = Buffer.from(suppliedHex, 'hex')
  return expected.length === supplied.length && expected.length > 0 && crypto.timingSafeEqual(expected, supplied)
}