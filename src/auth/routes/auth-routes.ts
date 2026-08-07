import express, { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requestOtp, verifyCode, googleSignIn, me, signup, issueToken } from '../controllers/auth-controller'

export const customerAuthRouter = Router()

customerAuthRouter.post('/request-otp', requestOtp)
customerAuthRouter.post('/verify', verifyCode)
customerAuthRouter.post('/google', express.text({ type: 'text/plain', limit: '16kb' }), googleSignIn)
customerAuthRouter.post('/signup', signup)
customerAuthRouter.post('/token', issueToken)
customerAuthRouter.get('/me', requireAuth, me)
