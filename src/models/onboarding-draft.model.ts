import { Schema, Document, Connection, Types } from 'mongoose'

export interface IOnboardingDraft extends Document {
  userId: Types.ObjectId
  division: 'digital' | 'print'
  planId: string
  billingCycle?: 'monthly' | 'annual'
  planSelection: {
    selected: string[]
    addOns: string[]
    addOnCounts: Record<string, number>
    inheritedOn: boolean
  }
  plans: Record<string, {
    selected: string[]
    addOns: string[]
    addOnCounts: Record<string, number>
    inheritedOn: boolean
  }>
  fields: {
    businessName?: string
    ownerName?: string
    phone?: string
    email?: string
    city?: string
    services?: string
    hours?: string
    address?: string
    visitorAction?: string
    notes?: string
  }
  step: number
  createdAt: Date
  updatedAt: Date
}

const DraftSchema = new Schema<IOnboardingDraft>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    division: { type: String, enum: ['digital', 'print'], default: 'digital' },
    planId: { type: String, default: '' },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    planSelection: {
      selected: { type: [String], default: [] },
      addOns: { type: [String], default: [] },
      addOnCounts: { type: Map, of: Number, default: {} },
      inheritedOn: { type: Boolean, default: true },
    },
    plans: {
      type: Map,
      of: new Schema(
        {
          selected: { type: [String], default: [] },
          addOns: { type: [String], default: [] },
          addOnCounts: { type: Map, of: Number, default: {} },
          inheritedOn: { type: Boolean, default: true },
        },
        { _id: false }
      ),
      default: {},
    },
    fields: {
      businessName: { type: String, trim: true },
      ownerName: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      city: { type: String, trim: true },
      services: { type: String, trim: true },
      hours: { type: String, trim: true },
      address: { type: String, trim: true },
      visitorAction: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    step: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

DraftSchema.index({ userId: 1, division: 1 }, { unique: true })

export function createOnboardingDraftModel(conn: Connection) {
  return conn.model<IOnboardingDraft>('OnboardingDraft', DraftSchema)
}