import { Schema, Document, Connection } from 'mongoose'

export interface PlanConfig {
  planId: string
  removedServices: string[]
  addOns: Record<string, number>
  billingCycle: 'monthly' | 'annual'
}

export interface IUser extends Document {
  name: string
  email?: string
  phone?: string
  googleId?: string
  photo?: string
  division: 'digital' | 'print'
  authProviders: string[]
  planConfig?: PlanConfig
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    photo: {
      type: String,
      trim: true,
    },
    division: {
      type: String,
      enum: ['digital', 'print'],
      default: 'digital',
    },
    authProviders: {
      type: [String],
      default: [],
    },
    planConfig: {
      planId: { type: String },
      removedServices: { type: [String], default: undefined },
      addOns: { type: Schema.Types.Mixed, default: undefined },
      billingCycle: { type: String, enum: ['monthly', 'annual'], default: undefined },
      _id: false,
    },
  },
  {
    timestamps: true,
  }
)

UserSchema.index(
  { email: 1, division: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
)
UserSchema.index(
  { phone: 1, division: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
)

export function createUserModel(conn: Connection) {
  return conn.model<IUser>('User', UserSchema)
}