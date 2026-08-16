import { getDivisionModels } from '../../../models/registry'

export async function listReminders(division: 'digital' | 'print', options: { sent: boolean; type?: string }) {
  const { Reminder } = getDivisionModels(division)
  const filter: Record<string, unknown> = { division, sent: options.sent }
  if (options.type) filter.type = options.type
  return Reminder.find(filter).sort({ dueDate: 1 }).limit(100).lean()
}

export async function dismissReminder(division: 'digital' | 'print', id: string) {
  const { Reminder } = getDivisionModels(division)
  await Reminder.updateOne(
    { _id: id, division },
    { $set: { sent: true, sentAt: new Date() } }
  )
}
