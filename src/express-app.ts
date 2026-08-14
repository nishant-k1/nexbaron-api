import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { customerAuthRouter } from './auth/routes/auth-routes'
import { digitalDraftRouter } from './features/digital/onboarding/routes/draft-routes'
import { catalogRouter } from './features/digital/catalog/routes/catalog-routes'
import { paymentRouter, paymentWebhookRouter } from './features/digital/payments/routes/payment-routes'
import { printRouter } from './features/print/routes/print-routes'
import {
  adminLeadRouter,
  brandContactRouter,
} from './leads/routes/lead-routes'
import { adminOrderRouter } from './orders/routes/order-routes'
import { customerQuoteRouter, adminQuoteRouter } from './quotes/routes/quote-routes'
import { customerChatRouter, adminChatRouter } from './chat/routes/chat-routes'
import { uploadRouter } from './chat/routes/upload-routes'
import { customerProjectRouter } from './features/projects/routes/project-routes'
import { adminProjectRouter } from './features/projects/admin-routes'
import { cronRouter } from './cron/routes'
import { adminReminderRouter } from './cron/admin-routes'
import { adminRecurringRouter } from './cron/recurring-routes'
import { testimonialRouter } from './cron/testimonial-routes'
import { reportRouter } from './features/reports/routes/report-routes'
import { customPlanAdminRouter } from './features/digital/catalog/routes/custom-plan-routes'
import { customPlanCustomerRouter } from './features/digital/catalog/routes/custom-plan-customer-routes'
import { businessRouter } from './features/digital/catalog/routes/business-routes'
import { serviceRouter } from './features/digital/catalog/routes/service-routes'
import { businessProfileRouter } from './features/digital/routes/business-profile-routes'
import { printBusinessProfileRouter } from './features/print/routes/business-profile-routes'
import cookieParser from 'cookie-parser'
import { adminAuthRouter } from './admin/routes/auth-routes'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found-handler'
import { runtimeBrand } from './utils/runtime-brand'

export const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGINS
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) || [(process.env.FRONTEND_URL || 'http://localhost:3000').trim()]
    // Allow requests without an Origin (curl, server-to-server) and whitelisted origins.
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Origin not allowed by CORS'))
    }
  },
  credentials: true,
}))

// Compression
app.use(compression())

// Razorpay webhook — must capture the raw body for signature verification,
// so mount its raw parser BEFORE the global JSON body parser.
if (runtimeBrand === 'digital') {
  app.use('/digital', paymentWebhookRouter)
}

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parsing
app.use(cookieParser())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

function mountBrandRoutes(brandBase: string): void {
  app.use(`${brandBase}/auth`, customerAuthRouter)
  app.use(brandBase, brandContactRouter)
  app.use(brandBase, customerQuoteRouter)
  app.use(brandBase, customerChatRouter)
  app.use(brandBase, uploadRouter)
  app.use(brandBase, customerProjectRouter)
  app.use(brandBase, cronRouter)

  if (runtimeBrand === 'digital') {
    app.use(`${brandBase}/drafts`, digitalDraftRouter)
    app.use(`${brandBase}/catalog`, catalogRouter)
    app.use(`${brandBase}/custom-plan`, customPlanCustomerRouter)
    app.use(`${brandBase}/payments`, paymentRouter)
    app.use(`${brandBase}`, businessRouter)
    app.use(`${brandBase}`, serviceRouter)
    app.use(`${brandBase}`, businessProfileRouter)
  } else {
    app.use(brandBase, printRouter)
    app.use(brandBase, printBusinessProfileRouter)
  }

  app.use(`${brandBase}/admin/auth`, adminAuthRouter)
  app.use(`${brandBase}/admin`, adminLeadRouter)
  app.use(`${brandBase}/admin`, adminChatRouter)
  app.use(`${brandBase}/admin`, adminOrderRouter)
  app.use(`${brandBase}/admin/quotes`, adminQuoteRouter)
  app.use(`${brandBase}/admin`, adminProjectRouter)
  app.use(`${brandBase}/admin`, adminReminderRouter)
  app.use(`${brandBase}/admin`, adminRecurringRouter)
  app.use(`${brandBase}/admin`, testimonialRouter)
  app.use(`${brandBase}/admin`, reportRouter)
  app.use(`${brandBase}/admin`, customPlanAdminRouter)
}

mountBrandRoutes(`/${runtimeBrand}`)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)
