import 'dotenv/config'
import { openBrandConnection } from './utils/database'
import { logger } from './utils/logger'
import { app } from './express-app'
import { runtimeBrand } from './config/brand'
import { initSentry } from './utils/sentry'
import * as Sentry from '@sentry/node'

initSentry()

const PORT = process.env.PORT || 3001

// Connect to database and start server
async function startServer() {
  try {
    const connection = await openBrandConnection()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}, brand=${runtimeBrand}, database=${connection.name}`)
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to start server')
    if (process.env.SENTRY_DSN) Sentry.captureException(error)
    process.exit(1)
  }
}

startServer()
