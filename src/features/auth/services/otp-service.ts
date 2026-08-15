import crypto from 'crypto'
import { getDivisionModels } from '../../../models/registry'
import { runtimeBrand } from '../../../utils/runtime-brand'
import { canSendMail, sendMail } from '../../../utils/mailer'
import { logger } from '../../../utils/logger'
import { logoNx, NX_DIGITAL, NX_PRINT } from '../../../utils/html'

export const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000
export const MAX_ATTEMPTS = 5
const REQUEST_WINDOW_MS = Number(process.env.OTP_REQUEST_WINDOW_MS) || 15 * 60 * 1000
const MAX_REQUESTS = Number(process.env.OTP_MAX_REQUESTS_PER_WINDOW) || 3

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
  channel: 'email' | 'sms' | 'whatsapp',
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
  channel: 'email' | 'sms' | 'whatsapp',
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

const brandColors: Record<string, { accent: string; accentSoft: string; label: string }> = {
  digital: { accent: '#2dd4bf', accentSoft: '#134e4a', label: 'Nexbaron Digital' },
  print: { accent: '#f59e0b', accentSoft: '#451a03', label: 'Nexbaron Print' },
}

function otpEmailHtml(code: string, purpose: string, expiresMinutes: number, brand: string): string {
  const c = brandColors[brand] ?? brandColors.digital
  const action = purpose === 'signup' ? 'Sign Up' : 'Log In'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:48px 16px">
<tr><td align="center">

  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

    <!-- Logo -->
    <tr><td align="center" style="padding-bottom:32px">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="background:#0f172a;border-radius:12px;padding:12px 16px">
          ${logoNx(brand === 'digital' ? NX_DIGITAL : NX_PRINT, 32, 32)}
        </td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:#0f172a;border-radius:20px;border:1px solid #1e293b;padding:40px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">

        <tr><td align="center" style="padding-bottom:24px">
          <span style="display:inline-block;background:${c.accentSoft};color:${c.accent};font-size:11px;font-weight:600;padding:4px 12px;border-radius:100px;letter-spacing:0.5px;text-transform:uppercase">${action} Code</span>
        </td></tr>

        <tr><td align="center" style="padding-bottom:8px">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.3px">Your verification code</h1>
        </td></tr>

        <tr><td align="center" style="padding-bottom:32px">
          <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6">Enter this code to ${purpose} to your ${c.label} account.</p>
        </td></tr>

        <tr><td align="center" style="padding-bottom:32px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#020617;border:1px solid ${c.accent}33;border-radius:16px;padding:20px 40px">
              <span style="font-size:36px;font-weight:800;color:${c.accent};letter-spacing:6px;font-family:'SF Mono',monospace">${code}</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding-bottom:24px">
          <hr style="border:0;border-top:1px solid #1e293b;margin:0">
        </td></tr>

        <tr><td align="center" style="padding-bottom:8px">
          <p style="margin:0;font-size:12px;color:#64748b">This code expires in <strong style="color:#94a3b8">${expiresMinutes} minutes</strong></p>
        </td></tr>

        <tr><td align="center">
          <p style="margin:0;font-size:11px;color:#475569">If you didn't request this, you can safely ignore this email.</p>
        </td></tr>

      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding-top:24px">
      <p style="margin:0;font-size:11px;color:#334155">Nexbaron Private Limited</p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`
}

async function deliverOtp(
  target: string,
  channel: 'email' | 'sms' | 'whatsapp',
  code: string,
  purpose: 'signup' | 'login'
): Promise<void> {
  if (isDevMode()) return

  if (channel === 'whatsapp') {
    await deliverWhatsApp(target, code, purpose)
    return
  }

  if (channel === 'sms') {
    throw new OtpRequestError('SMS verification is not configured for this deployment', 503)
  }

  if (!canSendMail()) {
    throw new OtpRequestError('Email delivery is not configured', 503)
  }

  const brand = runtimeBrand
  const from = process.env[`OTP_FROM_EMAIL_${brand.toUpperCase()}`] || `verify@nexbaron.com`
  const expiresMinutes = Math.ceil(OTP_TTL_MS / 60000)

  try {
    await sendMail({
      from,
      to: target as string,
      subject: `${purpose === 'signup' ? 'Sign Up' : 'Log In'} — Nexbaron ${brand.charAt(0).toUpperCase() + brand.slice(1)}`,
      html: otpEmailHtml(code, purpose, expiresMinutes, brand),
    })
  } catch {
    throw new OtpRequestError('Could not send the verification email', 502)
  }
}

async function deliverWhatsApp(target: string, code: string, _purpose: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new OtpRequestError('WhatsApp verification is not configured for this deployment', 503)
  }

  const phone = target.replace(/[^\d]/g, '')
  const brand = runtimeBrand
  const label = brand === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'nexbaron_otp',
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: code },
              { type: 'text', text: label },
            ],
          }],
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      logger.error('WhatsApp delivery failed', { status: res.status, error: err })
      throw new OtpRequestError('Could not send WhatsApp message', 502)
    }
  } catch (error) {
    if (error instanceof OtpRequestError) throw error
    logger.error('WhatsApp delivery error', error)
    throw new OtpRequestError('Could not send WhatsApp message', 502)
  }
}
