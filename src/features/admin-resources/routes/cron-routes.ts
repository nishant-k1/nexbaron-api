import { Router } from 'express'
import { generateReminders, sendDueReminders } from '../../leads/services/reminder-service'
import { runtimeBrand } from '../../../config/brand'
import { logger } from '../../../utils/logger'

export const cronRouter = Router()

cronRouter.post('/cron/reminders', async (_req, res) => {
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
