import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/require-auth'
import { requestOtp, verifyCode, googleSignIn, me } from '../controllers/auth-controller'

export const digitalAuthRouter = Router()

digitalAuthRouter.post('/request-otp', requestOtp)
digitalAuthRouter.post('/verify', verifyCode)
digitalAuthRouter.post('/google', googleSignIn)
digitalAuthRouter.get('/me', requireAuth, me)