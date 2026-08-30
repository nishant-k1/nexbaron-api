import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { customerAuthRouter } from './features/auth/routes/auth-routes'
import { adminAuthRouter } from './features/admin/routes/auth-routes'
import { businessProfileRouter } from './features/digital/routes/business-profile-routes'
import { catalogRouter } from './features/digital/routes/plan-routes'
import { serviceRouter } from './features/digital/routes/service-routes'
import { businessRouter } from './features/digital/routes/business-routes'
import { printBusinessProfileRouter } from './features/print/routes/business-profile-routes'
import { printRouter } from './features/print/routes/print-routes'
import { adminLeadRouter, brandContactRouter } from './features/leads/routes/lead-routes'
import { adminOrderRouter, customerOrderRouter } from './features/orders/routes/order-routes'
import { adminReminderRouter } from './features/admin-resources/routes/reminder-routes'
import { cronRouter } from './features/admin-resources/routes/cron-routes'
import { adminRecurringRouter } from './features/admin-resources/routes/recurring-routes'
import { testimonialRouter } from './features/admin-resources/routes/testimonial-routes'
import { reportRouter } from './features/reports/routes/report-routes'
import { customerAccountRouter, adminAccountRouter } from './features/accounts/routes/account-routes'
import { customerPackageRouter, adminPackageRouter } from './features/packages/routes/package-routes'
import { adminServiceRouter } from './features/services/routes/service-routes'
import { customerProposalRouter, adminProposalRouter } from './features/proposals/routes/proposal-routes'
import { customerBillingRouter, adminBillingRouter } from './features/billing/routes/billing-routes'
import { customerQuoteRouter, adminQuoteRouter } from './features/quotes/routes/quote-routes'
import { customerProjectRouter } from './features/projects/routes/project-routes'
import { adminProjectRouter } from './features/projects/routes/admin-routes'
import { customerChatRouter, adminChatRouter } from './features/chat/routes/chat-routes'
import { customerUploadRouter, adminUploadRouter } from './features/chat/routes/upload-routes'
import { paymentRouter, paymentWebhookRouter } from './features/digital/payments/routes/payment-routes'
import { digitalDraftRouter } from './features/digital/onboarding/routes/draft-routes'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found-handler'
import { requestContext } from './middleware/request-context'
import { runtimeBrand } from './config/brand'
import { metadataRouter } from './features/shared/metadata-routes'

export const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGINS
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) || [process.env.FRONTEND_URL!.trim()]
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

// Request correlation: attach a requestId (echoed as X-Request-Id) and a child
// logger carrying requestId/division/path/method to every request.
app.use(requestContext)

// Razorpay webhook needs the raw body for signature verification — mount before express.json().
if (runtimeBrand === 'digital') {
  app.use(`/${runtimeBrand}`, paymentWebhookRouter)
}

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Cookie parsing
app.use(cookieParser())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

function mountBrandRoutes(brandBase: string): void {
  app.use(`${brandBase}/auth`, customerAuthRouter)
  app.use(brandBase, brandContactRouter)

  // Customer routes shared across divisions
  app.use(brandBase, customerQuoteRouter)
  app.use(brandBase, customerProjectRouter)
  app.use(brandBase, customerChatRouter)
  app.use(brandBase, customerUploadRouter)

  if (runtimeBrand === 'digital') {
    app.use(`${brandBase}`, businessProfileRouter)
    app.use(`${brandBase}/catalog`, catalogRouter)
    app.use(brandBase, serviceRouter)
    app.use(brandBase, businessRouter)
    app.use(brandBase, customerAccountRouter)
    app.use(brandBase, customerPackageRouter)
    app.use(brandBase, customerProposalRouter)
    app.use(brandBase, customerBillingRouter)
    app.use(brandBase, customerOrderRouter)
    app.use(`${brandBase}/payments`, paymentRouter)
    app.use(`${brandBase}/drafts`, digitalDraftRouter)
    app.use(`${brandBase}/admin`, adminAccountRouter)
    app.use(`${brandBase}/admin`, adminPackageRouter)
    app.use(`${brandBase}/admin`, adminServiceRouter)
    app.use(`${brandBase}/admin`, adminProposalRouter)
    app.use(`${brandBase}/admin`, adminBillingRouter)
  } else {
    app.use(brandBase, printBusinessProfileRouter)
    app.use(brandBase, printRouter)
    // Hub needs account for both divisions (HubDashboard fetches /print/account)
    app.use(brandBase, customerAccountRouter)
  }

  app.use(`${brandBase}/admin/auth`, adminAuthRouter)
  app.use(`${brandBase}`, metadataRouter)
  app.use(`${brandBase}/admin`, adminLeadRouter)
  app.use(`${brandBase}/admin`, adminOrderRouter)
  app.use(`${brandBase}/admin`, adminReminderRouter)
  app.use(`${brandBase}/admin`, adminRecurringRouter)
  app.use(`${brandBase}/admin`, testimonialRouter)
  app.use(`${brandBase}/admin`, reportRouter)
  app.use(`${brandBase}/admin/quotes`, adminQuoteRouter)
  app.use(`${brandBase}/admin`, adminChatRouter)
  app.use(`${brandBase}/admin`, adminProjectRouter)
  app.use(`${brandBase}/admin`, adminUploadRouter)
  app.use(brandBase, cronRouter)
}

mountBrandRoutes(`/${runtimeBrand}`)

// Dev convenience: single API instance serves both catalogs so
// nexbaron-web doesn't require two separate ports (3001 + 3002) locally.
// Print catalog is static (no DB) so safe to expose cross-brand in dev.
if (process.env.NODE_ENV !== 'production') {
  if (runtimeBrand === 'digital') {
    app.use('/print', printRouter)
    app.use('/print', printBusinessProfileRouter)
  } else {
    app.use('/digital/catalog', catalogRouter)
    app.use('/digital', businessProfileRouter)
  }
}

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)
