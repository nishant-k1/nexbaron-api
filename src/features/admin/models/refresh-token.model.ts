import { Schema, Document, Types, Connection } from 'mongoose'

export interface IRefreshToken extends Document {
  staffId: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date
  rotatedFromHash?: string
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    rotatedFromHash: { type: String },
  },
  { timestamps: true, collection: 'staff_refresh_tokens' }
)

RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true })
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export function createRefreshTokenModel(conn: Connection) {
  return conn.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)
}
