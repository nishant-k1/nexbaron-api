import express, { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/require-auth'
import { requestOtp, verifyCode, googleSignIn, me } from '../controllers/auth-controller'

export const digitalAuthRouter = Router()

digitalAuthRouter.post('/request-otp', requestOtp)
digitalAuthRouter.post('/verify', verifyCode)
digitalAuthRouter.post('/google', express.text({ type: 'text/plain', limit: '16kb' }), googleSignIn)
digitalAuthRouter.get('/me', requireAuth, me)
