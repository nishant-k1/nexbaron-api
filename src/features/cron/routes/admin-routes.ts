import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { getDivisionModels } from '../../../models/registry'
import { logger } from '../../../utils/logger'

export const adminReminderRouter = Router()

adminReminderRouter.get('/reminders', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Reminder } = getDivisionModels(req.staffAuth.division)
    const sent = req.query.sent === 'true'
    const type = req.query.type as string | undefined
    const filter: Record<string, unknown> = { division: req.staffAuth.division, sent }
    if (type) filter.type = type

    const reminders = await Reminder.find(filter).sort({ dueDate: 1 }).limit(100).lean()
    res.json({ success: true, reminders })
  } catch (error) {
    logger.error('listReminders failed', error)
    res.status(500).json({ success: false, message: 'Failed to load reminders' })
  }
})

adminReminderRouter.post('/reminders/dismiss/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Reminder } = getDivisionModels(req.staffAuth.division)
    await Reminder.updateOne(
      { _id: req.params.id, division: req.staffAuth.division },
      { $set: { sent: true, sentAt: new Date() } }
    )
    res.json({ success: true })
  } catch (error) {
    logger.error('dismissReminder failed', error)
    res.status(500).json({ success: false, message: 'Failed to dismiss reminder' })
  }
})
