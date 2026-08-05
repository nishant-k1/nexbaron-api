import { openDivisionConnections } from './utils/database'
import type { DivisionConnections } from './utils/database'
import { logger } from './utils/logger'
import { app } from './express-app'

const PORT = process.env.PORT || 3001

// Connect to database and start server
async function startServer() {
  try {
    const connections: DivisionConnections = await openDivisionConnections()
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}, digital=${connections.digital.name}, print=${connections.print.name}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
