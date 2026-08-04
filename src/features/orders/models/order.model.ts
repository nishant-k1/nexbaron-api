import mongoose, { Schema, Document } from 'mongoose'

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

export interface IOrder extends Document {
  leadId: mongoose.Types.ObjectId
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
  amount: number
  currency: string
  status: OrderStatus
  payments: IPayment[]
  amountPaid: number
  dueDate?: Date
  invoiceNumber?: string
  notes?: string
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

const OrderSchema = new Schema<IOrder>(
  {
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
    amount: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'in_progress', 'delivered', 'cancelled'],
      default: 'pending',
    },
    payments: { type: [PaymentSchema], default: [] },
    amountPaid: { type: Number, default: 0 },
    dueDate: { type: Date },
    invoiceNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
)

OrderSchema.index({ division: 1, status: 1 })
OrderSchema.index({ 'customer.email': 1 })
OrderSchema.index({ 'customer.phone': 1 })
OrderSchema.index({ amountPaid: 1 })

export const Order = mongoose.model<IOrder>('Order', OrderSchema)