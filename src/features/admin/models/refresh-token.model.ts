import { Schema, model, Document, Types } from 'mongoose'

export interface IRefreshToken extends Document {
  staffId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date
  rotatedFrom?: string
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    rotatedFrom: { type: String },
  },
  { timestamps: true, collection: 'staff_refresh_tokens' }
)

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema)