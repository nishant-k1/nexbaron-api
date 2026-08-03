import { Request, Response } from 'express'
import { User } from '../../../../models/user.model'
import { createOtp, verifyOtp } from '../services/otp-service'
import { createToken } from '../../../shared/middleware/jwt'
import { logger } from '../../../../utils/logger'

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
    const { channel, target, name, purpose = 'signup', division = 'digital' } = req.body

    if (channel !== 'email' && channel !== 'phone' && channel !== 'sms') {
      res.status(400).json({ success: false, message: 'channel must be email, phone or sms' })
      return
    }
    if (!target) {
      res.status(400).json({ success: false, message: 'Missing email or phone number' })
      return
    }

    const normalized = channel === 'email' ? normalizeEmail(target) : normalizePhone(target)
    const otp = await createOtp(normalized, channel === 'phone' ? 'sms' : channel, purpose, division)

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${channel === 'email' ? 'your email' : 'your phone'}`,
      target: normalized,
      // Dev convenience: only include code when OTP_DEV_MODE is enabled.
      ...(process.env.OTP_DEV_MODE !== 'false' ? { devCode: otp.code } : {}),
    })
  } catch (error) {
    logger.error('requestOtp error:', error)
    res.status(500).json({ success: false, message: 'Failed to send verification code' })
  }
}

// Verify the OTP, create/find the user, and return a token.
export async function verifyCode(req: Request, res: Response) {
  try {
    const { channel, target, code, name, purpose = 'signup', division = 'digital' } = req.body

    if (!code) {
      res.status(400).json({ success: false, message: 'Missing verification code' })
      return
    }

    const normalized = channel === 'email' ? normalizeEmail(target) : normalizePhone(target)
    const result = await verifyOtp(normalized, code, channel === 'phone' ? 'sms' : channel, division)

    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message })
      return
    }

    const lookup: Record<string, string> = { division }
    if (channel === 'email') lookup.email = normalized
    else lookup.phone = normalized

    let user = await User.findOne(lookup)

    if (!user) {
      if (purpose === 'login') {
        res.status(400).json({ success: false, message: 'No account found with this ' + (channel === 'email' ? 'email' : 'phone number') })
        return
      }
      user = await User.create({
        name: name?.trim() || 'Customer',
        ...(channel === 'email' ? { email: normalized } : { phone: normalized }),
        division,
        authProviders: [channel === 'email' ? 'email' : 'phone'],
      })
    }

    if (name?.trim() && user.name === 'Customer') {
      user.name = name.trim()
      await user.save()
    }

    const token = createToken({ sub: String(user._id), division })

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
    logger.error('verifyCode error:', error)
    res.status(500).json({ success: false, message: 'Failed to verify code' })
  }
}

// Google sign-in. Expects { name, email, googleId, photo, division }.
export async function googleSignIn(req: Request, res: Response) {
  try {
    const { name, email, googleId, photo, division = 'digital' } = req.body

    if (!googleId || !email) {
      res.status(400).json({ success: false, message: 'Missing Google credentials' })
      return
    }

    let user: InstanceType<typeof User> | null = await User.findOne({
      email: normalizeEmail(email),
      division,
    })

    if (!user) {
      const created = await User.create({
        name: name?.trim() || email.split('@')[0],
        email: normalizeEmail(email),
        division,
        authProviders: ['google'],
        googleId,
        photo,
      })
      user = Array.isArray(created) ? created[0] : created
    } else if (!user.authProviders.includes('google')) {
      user.authProviders.push('google')
      user.set('photo', photo)
      await user.save()
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create user' })
      return
    }

    const token = createToken({ sub: String(user._id), division })

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
    logger.error('googleSignIn error:', error)
    res.status(500).json({ success: false, message: 'Failed to sign in with Google' })
  }
}

// Return the current user from a valid token.
export async function me(req: Request, res: Response) {
  try {
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
      },
    })
  } catch (error) {
    logger.error('me error:', error)
    res.status(500).json({ success: false, message: 'Failed to load user' })
  }
}