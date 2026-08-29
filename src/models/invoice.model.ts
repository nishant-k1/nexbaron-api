import { Schema, Document, Connection } from 'mongoose'

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'

export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface IInvoiceLineItem {
  label: string
  amount: number
  type: 'ONE_TIME' | 'RECURRING'
}

export interface IPayment {
  paymentId: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  amount: number
  status: PaymentStatus
  method?: string
  at: Date
}

export interface IInvoice extends Document {
  invoiceNumber: string
  accountId: string
  packageId?: string
  proposalCode?: string
  division: 'digital' | 'print'
  status: InvoiceStatus
  amount: number
  currency: string
  dueDate?: Date
  lineItems: IInvoiceLineItem[]
  payments: IPayment[]
  paymentSchedule?: 'FULL_UPFRONT' | 'FIFTY_FIFTY'
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>({
  label: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['ONE_TIME', 'RECURRING'], default: 'ONE_TIME' },
}, { _id: false })

const PaymentSchema = new Schema<IPayment>({
  paymentId: { type: String, required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'INITIATED' },
  method: { type: String },
  at: { type: Date, default: Date.now },
}, { _id: false })

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  accountId: { type: String, required: true, index: true },
  packageId: { type: String },
  proposalCode: { type: String, index: true, sparse: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  status: { type: String, enum: ['DRAFT', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'], default: 'PENDING' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  dueDate: { type: Date },
  lineItems: { type: [InvoiceLineItemSchema], default: [] },
  payments: { type: [PaymentSchema], default: [] },
  paymentSchedule: { type: String, enum: ['FULL_UPFRONT', 'FIFTY_FIFTY'], default: 'FULL_UPFRONT' },
  createdBy: { type: String },
}, { timestamps: true })

InvoiceSchema.index({ division: 1, proposalCode: 1 }, { unique: true, sparse: true, name: 'uq_division_proposalCode' })

export function createInvoiceModel(conn: Connection) {
  return conn.model<IInvoice>('Invoice', InvoiceSchema)
}
