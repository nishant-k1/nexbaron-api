import { Schema, Document, Types, Connection } from 'mongoose'

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

export function createRefreshTokenModel(conn: Connection) {
  return conn.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)
}