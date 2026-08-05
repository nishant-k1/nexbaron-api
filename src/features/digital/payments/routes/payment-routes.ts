import express, { Router } from 'express'
import { requireAuth } from '../../../../middleware/require-auth'
import { createCheckout, myOrder, razorpayWebhook, verifyPayment } from '../controllers/payment-controller'

export const paymentRouter = Router()

// Customer checkout (authenticated, bearer token).
paymentRouter.post('/create-order', requireAuth, createCheckout)
paymentRouter.get('/orders/mine', requireAuth, myOrder)
paymentRouter.post('/verify', requireAuth, verifyPayment)

// Server-side webhook uses the raw body for signature verification.
export const paymentWebhookRouter = Router()
paymentWebhookRouter.post('/razorpay-webhook', express.raw({ type: '*/*' }), razorpayWebhook)