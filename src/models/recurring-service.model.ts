import { Schema, Document, Connection } from 'mongoose'

export type RecurringType = 'maintenance' | 'blog' | 'social' | 'seo' | 'other'
export type RecurringStatus = 'active' | 'paused' | 'cancelled'

export interface IRecurringTask {
  description: string
  dueDate: Date
  done: boolean
  completedAt?: Date
}

export interface IRecurringService extends Document {
  division: 'digital' | 'print'
  projectId: string
  orderId: string
  type: RecurringType
  description: string
  frequency: string
  amount: number
  currency: string
  status: RecurringStatus
  startDate: Date
  nextDueDate: Date
  nextPaymentDate: Date
  tasks: IRecurringTask[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RecurringTaskSchema = new Schema<IRecurringTask>(
  {
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false }
)

const RecurringServiceSchema = new Schema<IRecurringService>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    projectId: { type: String, required: true },
    orderId: { type: String, required: true },
    type: { type: String, enum: ['maintenance', 'blog', 'social', 'seo', 'other'], required: true },
    description: { type: String, required: true, trim: true },
    frequency: { type: String, default: 'monthly' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    nextDueDate: { type: Date, required: true },
    nextPaymentDate: { type: Date, required: true },
    tasks: { type: [RecurringTaskSchema], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

RecurringServiceSchema.index({ division: 1, status: 1 })
RecurringServiceSchema.index({ projectId: 1 })
RecurringServiceSchema.index({ nextDueDate: 1 })
RecurringServiceSchema.index({ nextPaymentDate: 1 })

export function createRecurringServiceModel(conn: Connection) {
  return conn.model<IRecurringService>('RecurringService', RecurringServiceSchema)
}
