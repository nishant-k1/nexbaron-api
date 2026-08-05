import { Schema, Document, Connection } from 'mongoose'

export type StaffRole = 'owner' | 'admin' | 'staff'
export type StaffDivision = 'digital' | 'print'

export interface IStaff extends Document {
  email: string
  passwordHash: string
  name: string
  role: StaffRole
  division: StaffDivision
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const StaffSchema = new Schema<IStaff>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'staff'], default: 'staff' },
    division: { type: String, enum: ['digital', 'print'], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'staff' }
)

export function createStaffModel(conn: Connection) {
  return conn.model<IStaff>('Staff', StaffSchema)
}