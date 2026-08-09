import { Schema, Document, Connection } from 'mongoose'

export type ReminderType =
  | 'payment_due'
  | 'revision_pending'
  | 'onboarding_missing'
  | 'stage_stuck'

export interface IReminder extends Document {
  division: 'digital' | 'print'
  orderId: string
  type: ReminderType
  message: string
  dueDate: Date
  sent: boolean
  sentAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ReminderSchema = new Schema<IReminder>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    orderId: { type: String, required: true },
    type: { type: String, enum: ['payment_due', 'revision_pending', 'onboarding_missing', 'stage_stuck'], required: true },
    message: { type: String, required: true },
    dueDate: { type: Date, required: true },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
)

ReminderSchema.index({ division: 1, sent: 1, dueDate: 1 })
ReminderSchema.index({ orderId: 1, type: 1 }, { unique: true })

export function createReminderModel(conn: Connection) {
  return conn.model<IReminder>('Reminder', ReminderSchema)
}
