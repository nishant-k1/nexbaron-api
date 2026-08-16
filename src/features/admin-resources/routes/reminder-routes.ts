import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { getReminders, dismissReminderById } from '../controllers/admin-resources-controller'

export const adminReminderRouter = Router()

adminReminderRouter.get('/reminders', requireAdmin, requireDivision('digital', 'print'), getReminders)
adminReminderRouter.post('/reminders/dismiss/:id', requireAdmin, requireDivision('digital', 'print'), dismissReminderById)
