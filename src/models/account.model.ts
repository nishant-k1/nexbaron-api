import { Schema, Document, Connection } from 'mongoose'

export type LifecycleStage =
  | 'REGISTERED'
  | 'LEAD'
  | 'PACKAGE_SELECTED'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'CUSTOMER'

export const LIFECYCLE_STAGES: LifecycleStage[] = [
  'REGISTERED',
  'LEAD',
  'PACKAGE_SELECTED',
  'PROPOSAL_SENT',
  'PROPOSAL_ACCEPTED',
  'PAYMENT_PENDING',
  'CUSTOMER',
]

export interface IAccountNote {
  text: string
  by?: string
  at: Date
}

export interface IAccountStageHistory {
  stage: LifecycleStage
  by?: string
  at: Date
}

export interface IAccount extends Document {
  accountCode: string
  userId?: string
  leadId?: string
  division: 'digital' | 'print'
  name: string
  email?: string
  phone?: string
  company?: string
  lifecycleStage: LifecycleStage
  source?: string
  tags: string[]
  notes: IAccountNote[]
  stageHistory: IAccountStageHistory[]
  createdAt: Date
  updatedAt: Date
}

const AccountNoteSchema = new Schema<IAccountNote>({
  text: { type: String, required: true },
  by: { type: String },
  at: { type: Date, default: Date.now },
}, { _id: false })

const AccountStageHistorySchema = new Schema<IAccountStageHistory>({
  stage: { type: String, enum: LIFECYCLE_STAGES, required: true },
  by: { type: String },
  at: { type: Date, default: Date.now },
}, { _id: false })

const AccountSchema = new Schema<IAccount>({
  accountCode: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true, sparse: true },
  leadId: { type: String, index: true, sparse: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  lifecycleStage: { type: String, enum: LIFECYCLE_STAGES, default: 'REGISTERED' },
  source: { type: String },
  tags: { type: [String], default: [] },
  notes: { type: [AccountNoteSchema], default: [] },
  stageHistory: {
    type: [AccountStageHistorySchema],
    default: [{ stage: 'REGISTERED', at: new Date() }],
  },
}, { timestamps: true })

// Enforce the Account ownership invariant: one Account per (division, user).
// Partial filter excludes anonymous/lead placeholder accounts (null userId),
// so a user may still have separate division-scoped accounts (Digital/Print).
AccountSchema.index(
  { division: 1, userId: 1 },
  { unique: true, name: 'uq_division_userId', partialFilterExpression: { userId: { $type: 'string' } } }
)

export function createAccountModel(conn: Connection) {
  return conn.model<IAccount>('Account', AccountSchema)
}
