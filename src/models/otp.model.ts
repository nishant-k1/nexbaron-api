import mongoose, { Schema, Document } from 'mongoose'

export interface IOtp extends Document {
  target: string
  channel: 'email' | 'phone' | 'sms'
  code: string
  purpose: 'signup' | 'login'
  division: 'digital' | 'print'
  attempts: number
  expiresAt: Date
  verifiedAt?: Date
  createdAt: Date
}

const OtpSchema = new Schema<IOtp>(
  {
    target: { type: String, required: true, trim: true, lowercase: true },
    channel: { type: String, enum: ['email', 'phone', 'sms'], required: true },
    code: { type: String, required: true },
    purpose: { type: String, enum: ['signup', 'login'], default: 'signup' },
    division: { type: String, enum: ['digital', 'print'], default: 'digital' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    verifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

OtpSchema.index({ target: 1, division: 1, purpose: 1 })

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema)