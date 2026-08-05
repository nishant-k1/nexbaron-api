import 'dotenv/config'
import { openBrandConnection } from './utils/database'
import { logger } from './utils/logger'
import { app } from './express-app'
import { runtimeBrand } from './utils/runtime-brand'

const PORT = process.env.PORT || 3001

// Connect to database and start server
async function startServer() {
  try {
    const connection = await openBrandConnection()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}, brand=${runtimeBrand}, database=${connection.name}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
