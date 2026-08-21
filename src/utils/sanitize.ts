const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'authorization',
  'auth',
  'otp',
  'code',
  'secret',
  'apikey',
  'api_key',
  'cookie',
  'sessionid',
  'sessiontoken',
  'credential',
  'accesstoken',
  'refreshtoken',
  'refresh',
  'x-api-key',
  'set-cookie',
])

const PII_KEYS = new Set(['email', 'phone', 'phonenumber', 'mobile', 'name'])

function isSensitiveKey(key: string): boolean {
  const lk = key.toLowerCase()
  if (SENSITIVE_KEYS.has(lk)) return true
  return lk.includes('token') || lk.includes('password') || lk.includes('secret') || lk.includes('credential')
}

function redactString(value: string): string {
  return value
    .replace(/mongodb(\+srv)?:\/\/[^:\s/]+:[^@\s]+@/g, 'mongodb$1://[redacted]:[redacted]@')
    .replace(/X-Amz-Signature=[^&\s]+/g, 'X-Amz-Signature=[redacted]')
    .replace(/[?&]signature=[^&\s]+/gi, 'signature=[redacted]')
    .replace(/[?&]X-Amz-Credential=[^&\s]+/gi, 'X-Amz-Credential=[redacted]')
}

function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 1) return '[redacted]'
  const local = email.slice(0, 2) + '***'
  const domain = email.slice(at)
  return `${local}${domain}`
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return '***'
  return '***' + phone.slice(-3)
}

export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[omitted]'
  if (value === null || value === undefined) return value

  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message), stack: value.stack }
  }

  if (typeof value === 'string') return redactString(value)
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1))

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = '[redacted]'
    } else if (PII_KEYS.has(key.toLowerCase()) && typeof val === 'string') {
      out[key] = key.toLowerCase() === 'email' ? maskEmail(val) : maskPhone(val)
    } else {
      out[key] = sanitize(val, depth + 1)
    }
  }
  return out
}
