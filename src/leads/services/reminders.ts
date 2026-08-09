import { getDivisionModels } from '../../models/registry'
import { canSendMail, sendMail, fromAddress } from '../../utils/mailer'
import { logger } from '../../utils/logger'
import type { IReminder } from '../../models/reminder.model'

const STUCK_DAYS: Record<string, number> = {
  pending: 3,
  in_progress: 7,
}

const ONBOARDING_BLOCKERS = ['Domain access received', 'Content / text received']

export async function generateReminders(division: 'digital' | 'print') {
  const { Order, Reminder, Lead } = getDivisionModels(division)
  const now = new Date()
  const created: number[] = []

  const orders = await Order.find({
    division,
    status: { $in: ['pending', 'paid', 'in_progress'] },
  }).lean()

  for (const order of orders) {
    // Payment due in 3 days
    if (order.status === 'pending' && order.dueDate) {
      const daysUntilDue = Math.ceil((new Date(order.dueDate).getTime() - now.getTime()) / 86400000)
      if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        const count = await upsertReminder(Reminder, division, order._id.toString(), 'payment_due',
          `Payment of ₹${order.amount.toLocaleString('en-IN')} due in ${daysUntilDue} day${daysUntilDue === 0 ? ' (today)' : 's'}`,
          order.dueDate)
        if (count) created.push(count)
      }
    }

    // Revision pending for > 48h
    if (order.revisions?.feedback?.length) {
      const lastFeedback = order.revisions.feedback[order.revisions.feedback.length - 1]
      const hoursSinceFeedback = (now.getTime() - new Date(lastFeedback.at).getTime()) / 3600000
      if (hoursSinceFeedback > 48 && order.status === 'in_progress') {
        const count = await upsertReminder(Reminder, division, order._id.toString(), 'revision_pending',
          `Client has not responded to revision feedback for ${Math.floor(hoursSinceFeedback)} hours`,
          new Date(now.getTime() + 86400000))
        if (count) created.push(count)
      }
    }

    // Onboarding blocker — domain or content missing
    if (order.onboardingChecklist?.length) {
      const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : now.getTime()
      if (!isNaN(orderDate)) {
      for (const item of order.onboardingChecklist) {
        if (ONBOARDING_BLOCKERS.includes(item.item) && !item.done) {
          const blockedDays = Math.ceil((now.getTime() - orderDate) / 86400000)
          if (blockedDays > 2) {
            const count = await upsertReminder(Reminder, division, order._id.toString(), 'onboarding_missing',
              `"${item.item}" still pending after ${blockedDays} days`,
              new Date(now.getTime() + 43200000))
            if (count) created.push(count)
          }
        }
      }
      }
    }

    // Stage stuck
    const stuckDays = STUCK_DAYS[order.status]
    if (stuckDays) {
      const lastTransition = order.stageHistory?.length
        ? order.stageHistory[order.stageHistory.length - 1].at
        : order.createdAt
      const transitionTime = lastTransition ? new Date(lastTransition).getTime() : now.getTime()
      if (!isNaN(transitionTime)) {
      const daysInStage = Math.ceil((now.getTime() - transitionTime) / 86400000)
      if (daysInStage > stuckDays) {
        const count = await upsertReminder(Reminder, division, order._id.toString(), 'stage_stuck',
          `Project stuck in "${order.status}" for ${daysInStage} days (threshold: ${stuckDays})`,
          new Date(now.getTime() + 43200000))
        if (count) created.push(count)
      }
      }
    }

    // Review requested but not received within 7 days — nudge
    if (order.reviewRequestedAt && !order.reviewReceived) {
      const daysSinceRequest = Math.ceil((now.getTime() - new Date(order.reviewRequestedAt).getTime()) / 86400000)
      if (daysSinceRequest > 7) {
        const count = await upsertReminder(Reminder, division, order._id.toString(), 'stage_stuck',
          `Review requested ${daysSinceRequest} days ago, still not received — follow up with client`,
          new Date(now.getTime() + 43200000))
        if (count) created.push(count)
      }
    }
  }

  logger.info(`Reminders generated for ${division}: ${created.length} new`)
  return created
}

async function upsertReminder(
  Reminder: ReturnType<typeof import('../../models/reminder.model').createReminderModel>,
  division: 'digital' | 'print',
  orderId: string,
  type: IReminder['type'],
  message: string,
  dueDate: Date
): Promise<number> {
  try {
    await Reminder.create({ division, orderId, type: type as any, message, dueDate })
    return 1
  } catch (err) {
    if ((err as any).code === 11000) {
      await Reminder.updateOne(
        { orderId, type: type as any, sent: false },
        { $set: { message, dueDate } }
      )
      return 0
    }
    throw err
  }
}

export async function sendDueReminders(division: 'digital' | 'print'): Promise<number> {
  const { Reminder, Order, Lead } = getDivisionModels(division)
  const now = new Date()
  let sent = 0

  const reminders = await Reminder.find({ division, sent: false, dueDate: { $lte: now } }).limit(20)
  for (const reminder of reminders) {
    const order = await Order.findById(reminder.orderId).lean()
    const lead = order?.leadId ? await Lead.findById(order.leadId).lean() : null
    const email = order?.customer?.email || lead?.email
    const name = order?.customer?.name || lead?.name || 'there'

    let mailed = false
    if (email && canSendMail()) {
      try {
        await sendMail({
          from: fromAddress('hello'),
          to: email,
          subject: `Action needed: ${reminder.message}`,
          html: `<p>Hi ${name},</p><p>${reminder.message}</p><p>— Nexbaron</p>`,
        })
        mailed = true
      } catch (e) {
        logger.error(`Failed to send reminder email to ${email}`, e)
      }
    }

    if (mailed) {
      await Reminder.updateOne({ _id: reminder._id }, { $set: { sent: true, sentAt: now } })
      sent++
    }
  }

  logger.info(`Reminders sent for ${division}: ${sent}/${reminders.length}`)
  return sent
}
