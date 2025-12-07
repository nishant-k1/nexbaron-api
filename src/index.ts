import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { logger } from './utils/logger'
import { connectDatabase } from './utils/database'
import { contactRouter } from './features/contact/routes/contact-routes'
import { tenderRouter } from './features/tender/routes/tender-routes'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found-handler'

const app = express()
const PORT = process.env.PORT || 3001

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

// API routes
app.use('/api/contact', contactRouter)
app.use('/api/tenders', tenderRouter)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Connect to database and start server
async function startServer() {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

