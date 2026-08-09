import { Schema, Document, Types, Connection } from 'mongoose'

export type QuoteStatus = 'new' | 'quoted' | 'accepted' | 'lost' | 'closed'

export interface IQuoteNote {
  text: string
  staff?: string
  at: Date
}

export interface IQuoteCustomer {
  name: string
  email: string
  phone?: string
  company?: string
}

// Brand-specific request details live here as plain key/value maps so the
// print and digital forms can each store their own shape without bloating
// the shared model.
export interface IQuote extends Document {
  division: 'digital' | 'print'
  projectId: string
  userId?: Types.ObjectId
  leadId?: Types.ObjectId
  clientRequestId?: string
  quoteNumber: string
  customer: IQuoteCustomer
  source: string
  // Print: product, quantity, paperStock, finishing, estimatedPrice
  // Digital: planIds, addOnIds, businessType, goal
  selection: Record<string, unknown>
  details: Record<string, unknown>
  status: QuoteStatus
  assignedStaff?: string
  notes: IQuoteNote[]
  statusHistory: { status: QuoteStatus; at: Date }[]
  response?: {
    price?: number
    monthlyPrice?: number
    validityDays?: number
    message?: string
    channels: string[]
    sentBy?: string
    sentAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const QuoteNoteSchema = new Schema<IQuoteNote>(
  {
    text: { type: String, required: true },
    staff: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const QuoteStatusHistorySchema = new Schema(
  {
    status: { type: String, enum: ['new', 'quoted', 'accepted', 'lost', 'closed'], required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const ResponseSchema = new Schema(
  {
    price: { type: Number, min: 0 },
    monthlyPrice: { type: Number, min: 0 },
    validityDays: { type: Number, min: 1, default: 7 },
    message: { type: String, trim: true },
    channels: { type: [String], default: ['email'] },
    sentBy: { type: String },
    sentAt: { type: Date },
  },
  { _id: false }
)

const QuoteSchema = new Schema<IQuote>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    projectId: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    clientRequestId: { type: String, trim: true },
    quoteNumber: { type: String, trim: true, unique: true },
    customer: {
      name: { type: String, trim: true, required: true },
      email: { type: String, trim: true, lowercase: true, required: true },
      phone: { type: String, trim: true },
      company: { type: String, trim: true },
    },
    source: { type: String, default: 'web' },
    selection: { type: Schema.Types.Mixed, default: {} },
    details: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['new', 'quoted', 'accepted', 'lost', 'closed'],
      default: 'new',
    },
    assignedStaff: { type: String },
    notes: { type: [QuoteNoteSchema], default: [] },
    statusHistory: {
      type: [QuoteStatusHistorySchema],
      default: () => [{ status: 'new', at: new Date() }],
    },
    response: { type: ResponseSchema },
  },
  { timestamps: true }
)

QuoteSchema.index({ division: 1, status: 1 })
QuoteSchema.index({ division: 1, userId: 1 })
QuoteSchema.index({ division: 1, leadId: 1 })
QuoteSchema.index({ userId: 1, clientRequestId: 1 }, { unique: true, sparse: true })
QuoteSchema.index({ 'customer.email': 1, division: 1 })
QuoteSchema.index({ createdAt: -1 })

export function createQuoteModel(conn: Connection) {
  return conn.model<IQuote>('Quote', QuoteSchema)
}
