import { Schema, Document, Connection } from 'mongoose'

export type PackageType = 'STANDARD' | 'CUSTOM'
export type RecurringFrequency = 'MONTHLY' | 'ANNUAL'
export type PackageStatus = 'ANALYSIS' | 'IN_PROGRESS' | 'DELIVERED'
export type PaymentSchedule = 'FULL_UPFRONT' | 'FIFTY_FIFTY'
export type PackageVisibility = 'DRAFT' | 'LIVE'

export const PACKAGE_STATUSES: PackageStatus[] = ['ANALYSIS', 'IN_PROGRESS', 'DELIVERED']
export const PAYMENT_SCHEDULES: PaymentSchedule[] = ['FULL_UPFRONT', 'FIFTY_FIFTY']

export interface IPackage extends Document {
  packageCode: string
  accountId: string
  division: 'digital' | 'print'
  type: PackageType
  name: string
  description?: string
  visibility: PackageVisibility
  deliveryStatus: PackageStatus
  oneTimeEnabled: boolean
  oneTimeFee?: number
  paymentSchedule?: PaymentSchedule
  recurringEnabled: boolean
  recurringFee?: number
  recurringFrequency?: RecurringFrequency
  createdAt: Date
  updatedAt: Date
}

const PackageSchema = new Schema<IPackage>({
  packageCode: { type: String, required: true, unique: true, index: true },
  accountId: { type: String, required: true, index: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  type: { type: String, enum: ['STANDARD', 'CUSTOM'], default: 'STANDARD' },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  visibility: { type: String, enum: ['DRAFT', 'LIVE'], default: 'LIVE' },
  deliveryStatus: { type: String, enum: PACKAGE_STATUSES, default: 'ANALYSIS' },
  oneTimeEnabled: { type: Boolean, default: false },
  oneTimeFee: { type: Number, min: 0 },
  paymentSchedule: { type: String, enum: PAYMENT_SCHEDULES },
  recurringEnabled: { type: Boolean, default: false },
  recurringFee: { type: Number, min: 0 },
  recurringFrequency: { type: String, enum: ['MONTHLY', 'ANNUAL'] },
}, { timestamps: true })

export function createPackageModel(conn: Connection) {
  return conn.model<IPackage>('Package', PackageSchema)
}
