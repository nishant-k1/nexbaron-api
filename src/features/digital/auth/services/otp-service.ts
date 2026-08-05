import crypto from 'crypto'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'

export const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000
export const MAX_ATTEMPTS = 5

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function createOtp(target: string, channel: 'email' | 'phone' | 'sms', purpose: 'signup' | 'login', division: 'digital' | 'print') {
  const { Otp } = getDivisionModels(division)
  await Otp.deleteMany({ target, channel, division, purpose, verifiedAt: undefined })

  const code = generateCode()
  const otp = await Otp.create({
    target,
    channel,
    code,
    purpose,
    division,
    attempts: 0,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  })

  await deliverOtp(target, channel, code, purpose)
  return otp
}

export async function verifyOtp(target: string, code: string, channel: 'email' | 'phone' | 'sms', division: 'digital' | 'print') {
  const { Otp } = getDivisionModels(division)
  const otp = await Otp.findOne({
    target,
    channel,
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

  if (otp.code !== code) {
    await otp.save()
    return { ok: false, message: 'Incorrect code. Please try again.' }
  }

  otp.verifiedAt = new Date()
  await otp.save()
  return { ok: true, message: 'Verified', otp }
}

// Delivery layer. In dev this logs the code; wire real providers via env flags.
async function deliverOtp(target: string, channel: 'email' | 'phone' | 'sms', code: string, purpose: 'signup' | 'login') {
  const devMode = process.env.OTP_DEV_MODE !== 'false'

  if (channel === 'email') {
    logger.info(`[OTP:email] To ${target} — your Nexbaron verification code is ${code}`)
    if (!devMode && process.env.EMAIL_PROVIDER) {
      // TODO: plug SMTP / Resend / SendGrid here
    }
  } else {
    logger.info(`[OTP:sms] To ${target} — your Nexbaron verification code is ${code}`)
    if (!devMode && process.env.SMS_PROVIDER) {
      // TODO: plug Twilio / MSG91 here
    }
  }
}