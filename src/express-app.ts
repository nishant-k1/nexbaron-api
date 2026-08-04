import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { digitalAuthRouter } from './features/digital/auth/routes/auth-routes'
import { digitalDraftRouter } from './features/digital/onboarding/routes/draft-routes'
import { printRouter } from './features/print/routes/print-routes'
import { contactRouter, adminLeadRouter } from './features/leads/routes/lead-routes'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found-handler'

export const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes — segregated by division (mirrors nexbaron-web)
app.use('/api/digital/auth', digitalAuthRouter)
app.use('/api/digital/drafts', digitalDraftRouter)
app.use('/api/print', printRouter)
app.use('/api', contactRouter)
app.use('/api/admin', adminLeadRouter)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)
