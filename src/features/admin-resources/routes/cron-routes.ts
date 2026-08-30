import { Router, Request, Response, NextFunction } from 'express'
import { generateReminders, sendDueReminders } from '../../leads/services/reminder-service'
import { runtimeBrand } from '../../../config/brand'
import { logger } from '../../../utils/logger'

function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ success: false, message: 'Cron not configured' })
      return
    }
    next()
    return
  }
  const provided = req.header('x-cron-secret') || req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (provided !== secret) {
    res.status(401).json({ success: false, message: 'Unauthorized' })
    return
  }
  next()
}

export const cronRouter = Router()

cronRouter.post('/cron/reminders', requireCronSecret, async (_req, res) => {
  let generatedCount = 0
  let sentCount = 0
  try {
    const generated = await generateReminders(runtimeBrand)
    generatedCount = generated.length
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'cron generateReminders failed')
  }
  try {
    sentCount = await sendDueReminders(runtimeBrand)
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'cron sendDueReminders failed')
  }
  logger.info(`Cron completed for ${runtimeBrand}: ${generatedCount} generated, ${sentCount} sent`)
  res.json({ success: true, generated: generatedCount, sent: sentCount })
})
