import { Schema, Document, Connection } from 'mongoose'

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'proposal'
  | 'won'
  | 'lost'
  | 'dormant'

export interface ILead extends Document {
  division: 'digital' | 'print'
  accountId?: string
  projectId: string
  source: string
  // Common contact fields
  name: string
  email?: string
  phone?: string
  company?: string
  city?: string
  subject?: string
  message?: string
  // Digital-specific
  plan?: string
  businessType?: string
  goal?: string
  // Print-specific
  requirement?: string
  quantity?: string
  deadline?: string
  deliveryPincode?: string
  // CRM tracking
  status: LeadStatus
  assignedStaff?: string
  nextFollowUp?: Date
  tags: string[]
  notes: { text: string; staff?: string; at: Date }[]
  statusHistory: { status: LeadStatus; by?: string; at: Date }[]
  clientRef?: string
  // Qualification
  budget?: string
  hasDomain?: boolean
  timeline?: string
  rejectionReason?: string
  competitorInfo?: string
  // Referral
  referredBy?: {
    name: string
    email?: string
    projectId?: string
  }
  createdAt: Date
  updatedAt: Date
}

const LeadNoteSchema = new Schema(
  {
    text: { type: String, required: true },
    staff: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const LeadStatusHistorySchema = new Schema(
  {
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'unqualified', 'proposal', 'won', 'lost', 'dormant'], required: true },
    by: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const LeadSchema = new Schema<ILead>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    accountId: { type: String, index: true, sparse: true },
    projectId: { type: String, index: true },
    source: { type: String, default: 'web' },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, trim: true, sparse: true },
    company: { type: String, trim: true },
    city: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, trim: true },
    plan: { type: String, trim: true },
    businessType: { type: String, trim: true },
    goal: { type: String, trim: true },
    requirement: { type: String, trim: true },
    quantity: { type: String, trim: true },
    deadline: { type: String, trim: true },
    deliveryPincode: { type: String, trim: true },
    status: { type: String, enum: ['new', 'contacted', 'qualified', 'unqualified', 'proposal', 'won', 'lost', 'dormant'], default: 'new' },
    assignedStaff: { type: String },
    nextFollowUp: { type: Date },
    tags: { type: [String], default: [] },
    notes: { type: [LeadNoteSchema], default: [] },
    statusHistory: { type: [LeadStatusHistorySchema], default: [{ status: 'new', at: new Date() }] },
    clientRef: { type: String },
    budget: { type: String, trim: true },
    hasDomain: { type: Boolean },
    timeline: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    competitorInfo: { type: String, trim: true },
    referredBy: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      projectId: { type: String },
    },
  },
  {
    timestamps: true,
  }
)

LeadSchema.index({ division: 1, status: 1 })
LeadSchema.index({ 'statusHistory.at': 1 })
LeadSchema.index({ assignedStaff: 1, nextFollowUp: 1 })
LeadSchema.index({ division: 1, assignedStaff: 1 })
LeadSchema.index({ source: 1, createdAt: -1 })

export function createLeadModel(conn: Connection) {
  return conn.model<ILead>('Lead', LeadSchema)
}