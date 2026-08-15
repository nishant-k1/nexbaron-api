import { Router } from 'express'
import { generateReminders, sendDueReminders } from '../../leads/services/reminders'
import { runtimeBrand } from '../../../utils/runtime-brand'
import { logger } from '../../../utils/logger'

export const cronRouter = Router()

cronRouter.post('/cron/reminders', async (req, res) => {
  let generatedCount = 0
  let sentCount = 0
  try {
    const generated = await generateReminders(runtimeBrand)
    generatedCount = generated.length
  } catch (error) {
    logger.error('cron generateReminders failed', error)
  }
  try {
    sentCount = await sendDueReminders(runtimeBrand)
  } catch (error) {
    logger.error('cron sendDueReminders failed', error)
  }
  logger.info(`Cron completed for ${runtimeBrand}: ${generatedCount} generated, ${sentCount} sent`)
  res.json({ success: true, generated: generatedCount, sent: sentCount })
})
