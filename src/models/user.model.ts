import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email?: string
  phone?: string
  googleId?: string
  photo?: string
  division: 'digital' | 'print'
  authProviders: string[]
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
  },
  {
    timestamps: true,
  }
)

UserSchema.index({ email: 1, division: 1 }, { unique: true, sparse: true })
UserSchema.index({ phone: 1, division: 1 }, { unique: true, sparse: true })

export const User = mongoose.model<IUser>('User', UserSchema)