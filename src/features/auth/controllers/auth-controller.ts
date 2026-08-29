import { Request, Response } from 'express'
import { getDivisionModels } from '../../../models/registry'
import { createOtp, OtpRequestError, verifyOtp } from '../services/otp-service'
import { createToken } from '../../../middleware/jwt'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import { setCustomerCookie, clearCustomerCookie } from '../services/customer-cookie-service'

const GOOGLE_TIMEOUT_MS = 5000

interface GoogleClaims {
  sub: string
  email: string
  name: string
  picture?: string
}

class GoogleTokenError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits.startsWith('+') ? digits : `+91${digits}`
}

// Send an OTP to email or phone for signup/login.
export async function requestOtp(req: Request, res: Response) {
  try {
    const { channel, target, purpose = 'signup' } = req.body ?? {}

    if (channel !== 'email' && channel !== 'phone' && channel !== 'sms' && channel !== 'whatsapp') {
      res.status(400).json({ success: false, message: 'channel must be email, phone, sms or whatsapp' })
      return
    }
    if (!target) {
      res.status(400).json({ success: false, message: 'Missing email or phone number' })
      return
    }
    if (purpose !== 'signup' && purpose !== 'login') {
      res.status(400).json({ success: false, message: 'purpose must be signup or login' })
      return
    }

    const normalized = channel === 'email' ? normalizeEmail(target) : normalizePhone(target)
    const otpChannel = channel === 'email' ? 'email' : channel === 'whatsapp' ? 'whatsapp' : 'sms'
    const otp = await createOtp(normalized, otpChannel, purpose, runtimeBrand)

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${channel === 'email' ? 'your email' : channel === 'whatsapp' ? 'your WhatsApp' : 'your phone'}`,
      target: normalized,
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    })
  } catch (error) {
    if (error instanceof OtpRequestError) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    return handleError('requestOtp', req, res, error, 'Failed to send verification code')
  }
}

// Verify the OTP, create/find the user, and return a token.
export async function verifyCode(req: Request, res: Response) {
  try {
    const { channel, target, code, name, purpose = 'signup' } = req.body ?? {}

    if ((channel !== 'email' && channel !== 'phone' && channel !== 'sms' && channel !== 'whatsapp') || !target || !code) {
      res.status(400).json({ success: false, message: 'Missing verification code' })
      return
    }
    if (purpose !== 'signup' && purpose !== 'login') {
      res.status(400).json({ success: false, message: 'purpose must be signup or login' })
      return
    }

    const normalized = channel === 'email' ? normalizeEmail(target) : normalizePhone(target)
    const result = await verifyOtp(
      normalized,
      String(code),
      channel === 'email' ? 'email' : channel === 'whatsapp' ? 'whatsapp' : 'sms',
      purpose,
      runtimeBrand
    )

    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message })
      return
    }

    const d = runtimeBrand
    const { User } = getDivisionModels(d)

    const lookup: Record<string, string> = { division: d }
    if (channel === 'email') lookup.email = normalized
    else lookup.phone = normalized

    let user = await User.findOne(lookup)

    if (!user) {
      try {
        user = await User.create({
          name: name?.trim() || 'Customer',
          ...(channel === 'email' ? { email: normalized } : { phone: normalized }),
          division: d,
          authProviders: [channel === 'email' ? 'email' : 'phone'],
        })
      } catch (e: any) {
        if (e?.code === 11000) {
          user = await User.findOne(lookup)
          if (!user) throw e
        } else throw e
      }
    }

    if (name?.trim() && user.name === 'Customer') {
      user.name = name.trim()
      await user.save()
    }

    const token = createToken({ sub: String(user._id), division: d })
    setCustomerCookie(res, token)

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        division: user.division,
      },
    })
  } catch (error) {
    return handleError('verifyCode', req, res, error, 'Failed to verify code')
  }
}

// Google sign-in. Identity is derived only from Google's verified ID token claims.
export async function googleSignIn(req: Request, res: Response) {
  try {
    const credential = typeof req.body === 'string' ? req.body : req.body?.credential
    if (typeof credential !== 'string' || !credential.trim()) {
      res.status(400).json({ success: false, message: 'Missing Google ID token credential' })
      return
    }
    const claims = await verifyGoogleCredential(credential.trim())

    const d = runtimeBrand
    const { User } = getDivisionModels(d)

    let user: InstanceType<ReturnType<typeof getDivisionModels>['User']> | null = await User.findOne({
      $or: [{ googleId: claims.sub }, { email: claims.email }],
      division: d,
    })

    if (!user) {
      const created = await User.create({
        name: claims.name,
        email: claims.email,
        division: d,
        authProviders: ['google'],
        googleId: claims.sub,
        photo: claims.picture,
      })
      user = Array.isArray(created) ? created[0] : created
    } else {
      if (!user.authProviders.includes('google')) user.authProviders.push('google')
      user.googleId = claims.sub
      user.email = claims.email
      user.name = claims.name
      user.photo = claims.picture
      await user.save()
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create user' })
      return
    }

    const token = createToken({ sub: String(user._id), division: d })
    setCustomerCookie(res, token)

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        division: user.division,
        photo: user.get('photo') || null,
      },
    })
  } catch (error) {
    if (error instanceof GoogleTokenError) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    return handleError('googleSignIn', req, res, error, 'Failed to sign in with Google')
  }
}

async function verifyGoogleCredential(credential: string): Promise<GoogleClaims> {
  const clientId = process.env[`GOOGLE_CLIENT_ID_${runtimeBrand.toUpperCase()}`]
  if (!clientId) throw new GoogleTokenError('Google sign-in is not configured', 503)

  let response: globalThis.Response
  try {
    response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    })
  } catch {
    throw new GoogleTokenError('Google token verification is unavailable', 502)
  }
  if (!response.ok) throw new GoogleTokenError('Invalid Google ID token', 401)

  const claims = await response.json() as Record<string, unknown>
  if (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') {
    throw new GoogleTokenError('Invalid Google token issuer', 401)
  }
  if (claims.aud !== clientId) throw new GoogleTokenError('Google token audience mismatch', 401)
  if (claims.email_verified !== 'true' && claims.email_verified !== true) {
    throw new GoogleTokenError('Google email is not verified', 401)
  }
  if (typeof claims.exp !== 'string' || Number(claims.exp) <= Math.floor(Date.now() / 1000)) {
    throw new GoogleTokenError('Google ID token has expired', 401)
  }
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string' || !claims.email) {
    throw new GoogleTokenError('Google token is missing required identity claims', 401)
  }

  const email = normalizeEmail(claims.email)
  const claimedName = typeof claims.name === 'string' ? claims.name.trim() : ''
  const fallbackName = email.split('@')[0]
  return {
    sub: claims.sub,
    email,
    name: claimedName.length >= 2 ? claimedName : fallbackName.length >= 2 ? fallbackName : 'Google User',
    picture: typeof claims.picture === 'string' ? claims.picture : undefined,
  }
}

// Return the current user from a valid token.
export async function me(req: Request, res: Response) {
  try {
    const { User } = getDivisionModels(runtimeBrand)
    const user = await User.findById(req.userId)
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' })
      return
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        division: user.division,
        photo: (user as unknown as { photo?: string }).photo || null,
        planConfig: (user as any).planConfig || null,
      },
    })
  } catch (error) {
    return handleError('me', req, res, error, 'Failed to load user')
  }
}

/**
 * Create user account without OTP — used when a visitor signs up
 * via the pricing page with name + email + phone.
 */
export async function signup(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { User } = getDivisionModels(division)
    const { name, email, phone } = req.body

    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ success: false, message: 'Name and email are required' })
      return
    }

    const normalizedEmail = normalizeEmail(email)
    const normalizedPhone = phone ? normalizePhone(phone) : undefined

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail, division })
    if (existing) {
      res.status(409).json({ success: false, message: 'Account already exists', userId: existing._id })
      return
    }

    let user: any
    try {
      user = await User.create({
        division,
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
      })
    } catch (e: any) {
      // Race: concurrent signup with same email both passed findOne check — second hits unique index
      if (e?.code === 11000) {
        const dup = await User.findOne({ email: normalizedEmail, division }).lean()
        res.status(409).json({ success: false, message: 'Account already exists', userId: dup?._id })
        return
      }
      throw e
    }

    // The account was just created in this request — return its session token
    // so the signup flow can log the visitor straight into the hub. No token
    // is ever minted for pre-existing accounts (login requires OTP).
    const token = createToken({ sub: user._id.toString(), division: user.division })
    setCustomerCookie(res, token)

    res.status(201).json({
      success: true,
      userId: user._id,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        division: user.division,
      },
    })
  } catch (error) {
    return handleError('signup', req, res, error, 'Failed to create account')
  }
}


/**
 * Update the authenticated user's profile (name, email, phone).
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const { User } = getDivisionModels(req.division!)
    const { name, email, phone } = req.body
    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ success: false, message: 'Name and email are required' })
      return
    }
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail, division: req.division, _id: { $ne: req.userId } })
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already in use' })
      return
    }
    const update: Record<string, unknown> = { name: name.trim(), email: normalizedEmail }
    if (phone?.trim()) update.phone = phone.trim()
    await User.updateOne({ _id: req.userId, division: req.division }, { $set: update })
    res.json({ success: true, message: 'Profile updated' })
  } catch (error) {
    return handleError('updateProfile', req, res, error, 'Failed to update profile')
  }
}

/**
 * Sign out — clears the customer cookie ( Bearer token stays valid until expiry ).
 */
export async function signOut(_req: Request, res: Response) {
  clearCustomerCookie(res)
  res.json({ success: true, message: 'Signed out' })
}

/**
 * Permanently delete the authenticated user's account.
 */
export async function deleteAccount(req: Request, res: Response) {
  try {
    const { User } = getDivisionModels(req.division!)
    await User.deleteOne({ _id: req.userId, division: req.division })
    clearCustomerCookie(res)
    res.json({ success: true, message: 'Account deleted' })
  } catch (error) {
    return handleError('deleteAccount', req, res, error, 'Failed to delete account')
  }
}


/**
 * Save the user's plan customisations.
 */
export async function savePlan(req: Request, res: Response) {
  try {
    const { User } = getDivisionModels(req.division!)
    const { planId, removedServices, addOns, billingCycle } = req.body
    if (!planId) {
      res.status(400).json({ success: false, message: 'planId is required' })
      return
    }
    const normalizedCycle = billingCycle === 'annual' ? 'annual' : 'monthly'
    await User.updateOne(
      { _id: req.userId, division: req.division },
      {
        $set: {
          planConfig: {
            planId,
            removedServices: removedServices || [],
            addOns: addOns || {},
            billingCycle: normalizedCycle,
          },
        },
      }
    )
    res.json({ success: true, message: 'Plan saved' })
  } catch (error) {
    return handleError('savePlan', req, res, error, 'Failed to save plan')
  }
}
