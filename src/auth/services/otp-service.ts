import crypto from 'crypto'
import { getDivisionModels } from '../../models/registry'
import { runtimeBrand } from '../../utils/runtime-brand'

export const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000
export const MAX_ATTEMPTS = 5
const REQUEST_WINDOW_MS = Number(process.env.OTP_REQUEST_WINDOW_MS) || 15 * 60 * 1000
const MAX_REQUESTS = Number(process.env.OTP_MAX_REQUESTS_PER_WINDOW) || 3
const DELIVERY_TIMEOUT_MS = 8000

export class OtpRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function isDevMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_MODE !== 'false'
}

function hashSecret(): string {
  const configured = process.env[`OTP_HASH_SECRET_${runtimeBrand.toUpperCase()}`]
  if (process.env.NODE_ENV === 'production' && (!configured || configured === 'change-me-otp-hash-secret')) {
    throw new OtpRequestError('OTP hashing is not configured', 503)
  }
  return configured || 'nexbaron-otp-dev-secret'
}

function hashCode(code: string): string {
  return crypto.createHmac('sha256', hashSecret()).update(code).digest('hex')
}

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function createOtp(
  target: string,
  channel: 'email' | 'sms',
  purpose: 'signup' | 'login',
  division: 'digital' | 'print'
): Promise<{ devCode?: string }> {
  const { Otp } = getDivisionModels(division)
  const recentRequests = await Otp.countDocuments({
    target,
    channel,
    division,
    createdAt: { $gte: new Date(Date.now() - REQUEST_WINDOW_MS) },
  })
  if (recentRequests >= MAX_REQUESTS) {
    throw new OtpRequestError('Too many verification codes requested. Please try again later.', 429)
  }

  const code = generateCode()
  await deliverOtp(target, channel, code, purpose)
  await Otp.create({
    target,
    channel,
    codeHash: hashCode(code),
    purpose,
    division,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })
  return isDevMode() ? { devCode: code } : {}
}

export async function verifyOtp(
  target: string,
  code: string,
  channel: 'email' | 'sms',
  purpose: 'signup' | 'login',
  division: 'digital' | 'print'
) {
  const { Otp } = getDivisionModels(division)
  const otp = await Otp.findOne({
    target,
    channel,
    purpose,
    division,
    verifiedAt: undefined,
  }).sort({ createdAt: -1 })

  if (!otp) return { ok: false, message: 'No active verification code. Request a new one.' }
  if (otp.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({ _id: otp._id })
    return { ok: false, message: 'Code expired. Request a new one.' }
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otp._id })
    return { ok: false, message: 'Too many attempts. Request a new code.' }
  }

  otp.attempts += 1
  const expected = Buffer.from(otp.codeHash, 'hex')
  const supplied = Buffer.from(hashCode(code), 'hex')
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    await otp.save()
    return { ok: false, message: 'Incorrect code. Please try again.' }
  }

  otp.verifiedAt = new Date()
  await otp.save()
  return { ok: true, message: 'Verified', otp }
}

async function deliverOtp(
  target: string,
  channel: 'email' | 'sms',
  code: string,
  purpose: 'signup' | 'login'
): Promise<void> {
  if (isDevMode()) return
  if (channel === 'sms') {
    throw new OtpRequestError('Phone verification is not configured for this deployment', 503)
  }

  const apiKey = process.env[`RESEND_API_KEY_${runtimeBrand.toUpperCase()}`]
  const from = process.env[`OTP_FROM_EMAIL_${runtimeBrand.toUpperCase()}`]
  if (!apiKey || !from) {
    throw new OtpRequestError('Email verification is not configured for this deployment', 503)
  }

  let response: globalThis.Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: target,
        subject: `Your Nexbaron ${purpose} verification code`,
        html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.ceil(OTP_TTL_MS / 60000)} minutes.</p>`,
      }),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    })
  } catch {
    throw new OtpRequestError('Could not send the verification email', 502)
  }
  if (!response.ok) {
    throw new OtpRequestError('Could not send the verification email', 502)
  }
}
