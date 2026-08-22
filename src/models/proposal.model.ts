import { Schema, Document, Connection } from 'mongoose'

export type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED'
export type RecurringFrequency = 'MONTHLY' | 'ANNUAL'
export type PaymentSchedule = 'FULL_UPFRONT' | 'FIFTY_FIFTY'

export interface IProposalService {
  serviceCode: string
  name: string
  description?: string
}

export interface IProposalPricing {
  oneTimeEnabled: boolean
  oneTimeFee: number
  paymentSchedule?: PaymentSchedule
  recurringEnabled: boolean
  recurringFee: number
  recurringFrequency?: RecurringFrequency
}

export interface IProposal extends Document {
  proposalCode: string
  accountId: string
  packageId?: string
  division: 'digital' | 'print'
  version: number
  status: ProposalStatus
  title: string
  description?: string
  services: IProposalService[]
  pricing: IProposalPricing
  terms?: string
  notes?: string
  acceptedAt?: Date
  acceptedBy?: string
  acceptedVersion?: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const ProposalServiceSchema = new Schema<IProposalService>({
  serviceCode: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
}, { _id: false })

const ProposalPricingSchema = new Schema<IProposalPricing>({
  oneTimeEnabled: { type: Boolean, default: false },
  oneTimeFee: { type: Number, default: 0, min: 0 },
  paymentSchedule: { type: String, enum: ['FULL_UPFRONT', 'FIFTY_FIFTY'] },
  recurringEnabled: { type: Boolean, default: false },
  recurringFee: { type: Number, default: 0, min: 0 },
  recurringFrequency: { type: String, enum: ['MONTHLY', 'ANNUAL'] },
}, { _id: false })

const ProposalSchema = new Schema<IProposal>({
  proposalCode: { type: String, required: true, unique: true, index: true },
  accountId: { type: String, required: true, index: true },
  packageId: { type: String, index: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  version: { type: Number, default: 1 },
  status: { type: String, enum: ['DRAFT', 'SENT', 'ACCEPTED'], default: 'DRAFT' },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  services: { type: [ProposalServiceSchema], default: [] },
  pricing: {
    type: ProposalPricingSchema,
    default: () => ({ oneTimeEnabled: false, oneTimeFee: 0, recurringEnabled: false, recurringFee: 0 }),
  },
  terms: { type: String },
  notes: { type: String },
  acceptedAt: { type: Date },
  acceptedBy: { type: String },
  acceptedVersion: { type: Number },
  createdBy: { type: String },
}, { timestamps: true })

export function createProposalModel(conn: Connection) {
  return conn.model<IProposal>('Proposal', ProposalSchema)
}
