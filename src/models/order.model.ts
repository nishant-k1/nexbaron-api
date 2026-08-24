import { Schema, Document, Connection, Types } from 'mongoose'

export type OrderStatus =
  | 'pending' // created, awaiting payment
  | 'paid' // payment received → the lead is now a customer
  | 'in_progress'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod =
  | 'razorpay'
  | 'upi'
  | 'bank'
  | 'cash'
  | 'other'

export interface IPayment {
  method: PaymentMethod
  amount: number
  receivedAt: Date
  reference?: string
  recordedBy?: string
}

export type BillingCycle = 'setup' | 'monthly' | 'annual'

export type PlanBillingCycle = 'monthly' | 'annual'

export interface IOrderItem {
  kind: 'plan' | 'service' | 'addon'
  planId: string
  label: string
  billingCycle: BillingCycle
  price: number
  costPrice?: number
  quantity: number
}

export interface IOrderMilestone {
  key: string
  label: string
  dayLabel: string
  date?: Date
  status: 'pending' | 'in_progress' | 'done'
  completedAt?: Date
}

export interface IRevisionFeedback {
  text: string
  by: string
  at: Date
}

export interface IRevisionTracking {
  used: number
  max: number
  feedback: IRevisionFeedback[]
}

export interface IOnboardingItem {
  item: string
  done: boolean
  note?: string
}

export interface IStageTransition {
  stage: string
  by: string
  at: Date
}

export interface ISocialLinks {
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  website?: string
}

export interface ILiveUrl {
  label: string
  url: string
}

export interface IOrder extends Document {
  projectId: string
  userId?: Types.ObjectId
  leadId: Types.ObjectId
  division: 'digital' | 'print'
  // Snapshot of the customer (denormalised from the lead)
  customer: {
    name: string
    email?: string
    phone?: string
    company?: string
    city?: string
  }
  // What was sold
  service?: string
  billingCycle?: PlanBillingCycle
  amount: number
  currency: string
  status: OrderStatus
  items: IOrderItem[]
  payments: IPayment[]
  amountPaid: number
  dueDate?: Date
  launchDate?: Date
  launchDays?: number
  milestones: IOrderMilestone[]
  razorpay?: {
    orderId?: string
    paymentId?: string
    signature?: string
  }
  billing?: {
    gstin?: string
    address?: string
  }
  invoiceNumber?: string
  proposalCode?: string
  notes?: string
  // Project lifecycle
  assignedTeamMember?: string
  onboardingChecklist: IOnboardingItem[]
  revisions: IRevisionTracking
  stageHistory: IStageTransition[]
  stagingUrl?: string
  liveWebsiteUrl?: string
  liveUrls?: ILiveUrl[]
  socialLinks?: ISocialLinks
  googleBusinessProfile?: {
    created: boolean
    verified: boolean
  }
  paymentTerms?: string
  followUpDate?: Date
  followUpType?: 'review' | 'upsell' | 'referral' | 'checkin'
  // Review & testimonials
  reviewRequestedAt?: Date
  reviewReceived: boolean
  reviewRating?: number
  reviewUrl?: string
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema(
  {
    method: { type: String, enum: ['razorpay', 'upi', 'bank', 'cash', 'other'], default: 'other' },
    amount: { type: Number, required: true, min: 0 },
    receivedAt: { type: Date, default: Date.now },
    reference: { type: String },
    recordedBy: { type: String },
  },
  { _id: false }
)

const OrderItemSchema = new Schema<IOrderItem>(
  {
    kind: { type: String, enum: ['plan', 'service', 'addon'], required: true },
    planId: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    billingCycle: { type: String, enum: ['setup', 'monthly', 'annual'], required: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
)

const MilestoneSchema = new Schema<IOrderMilestone>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    dayLabel: { type: String, trim: true },
    date: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
    },
    completedAt: { type: Date },
  },
  { _id: false }
)

const RazorpaySchema = new Schema(
  {
    orderId: { type: String, trim: true },
    paymentId: { type: String, trim: true },
    signature: { type: String, trim: true },
  },
  { _id: false }
)

const BillingSchema = new Schema(
  {
    gstin: { type: String, trim: true, uppercase: true },
    address: { type: String, trim: true },
  },
  { _id: false }
)

const RevisionFeedbackSchema = new Schema<IRevisionFeedback>(
  {
    text: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const RevisionTrackingSchema = new Schema<IRevisionTracking>(
  {
    used: { type: Number, default: 0, min: 0 },
    max: { type: Number, default: 2, min: 1 },
    feedback: { type: [RevisionFeedbackSchema], default: [] },
  },
  { _id: false }
)

const OnboardingItemSchema = new Schema<IOnboardingItem>(
  {
    item: { type: String, required: true },
    done: { type: Boolean, default: false },
    note: { type: String, trim: true },
  },
  { _id: false }
)

const StageTransitionSchema = new Schema<IStageTransition>(
  {
    stage: { type: String, required: true },
    by: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const GoogleBusinessProfileSchema = new Schema(
  {
    created: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
)

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    instagram: { type: String, trim: true },
    facebook: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    website: { type: String, trim: true },
  },
  { _id: false }
)

const LiveUrlSchema = new Schema<ILiveUrl>(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    projectId: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    division: { type: String, enum: ['digital', 'print'], required: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      company: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    service: { type: String, trim: true },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    amount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'in_progress', 'delivered', 'cancelled'],
      default: 'pending',
    },
    items: { type: [OrderItemSchema], default: [] },
    payments: { type: [PaymentSchema], default: [] },
    amountPaid: { type: Number, default: 0 },
    dueDate: { type: Date },
    launchDate: { type: Date },
    launchDays: { type: Number, min: 1 },
    milestones: { type: [MilestoneSchema], default: [] },
    razorpay: { type: RazorpaySchema },
    billing: { type: BillingSchema },
    invoiceNumber: { type: String, trim: true },
    proposalCode: { type: String, trim: true, index: true },
    notes: { type: String, trim: true },
    assignedTeamMember: { type: String, trim: true },
    onboardingChecklist: { type: [OnboardingItemSchema], default: [] },
    revisions: { type: RevisionTrackingSchema, default: () => ({ used: 0, max: 2, feedback: [] }) },
    stageHistory: { type: [StageTransitionSchema], default: [] },
    stagingUrl: { type: String, trim: true },
    liveWebsiteUrl: { type: String, trim: true },
    liveUrls: { type: [LiveUrlSchema], default: undefined },
    socialLinks: { type: SocialLinksSchema, default: undefined },
    googleBusinessProfile: { type: GoogleBusinessProfileSchema, default: () => ({ created: false, verified: false }) },
    paymentTerms: { type: String, trim: true },
    followUpDate: { type: Date },
    followUpType: { type: String, enum: ['review', 'upsell', 'referral', 'checkin'] },
    reviewRequestedAt: { type: Date },
    reviewReceived: { type: Boolean, default: false },
    reviewRating: { type: Number, min: 1, max: 5 },
    reviewUrl: { type: String, trim: true },
  },
  { timestamps: true }
)

OrderSchema.index({ division: 1, status: 1 })
OrderSchema.index({ userId: 1, division: 1 })
OrderSchema.index({ 'customer.email': 1 })
OrderSchema.index({ 'customer.phone': 1 })
OrderSchema.index({ amountPaid: 1 })
OrderSchema.index({ 'razorpay.orderId': 1 }, { sparse: true })

export function createOrderModel(conn: Connection) {
  return conn.model<IOrder>('Order', OrderSchema)
}