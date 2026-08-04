import { Schema, model, Document } from 'mongoose'

export interface IStaff extends Document {
  email: string
  passwordHash: string
  name: string
  role: 'admin' | 'staff'
  division: 'digital' | 'print' | 'both'
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const StaffSchema = new Schema<IStaff>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    division: { type: String, enum: ['digital', 'print', 'both'], default: 'both' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'staff' }
)

export const Staff = model<IStaff>('Staff', StaffSchema)