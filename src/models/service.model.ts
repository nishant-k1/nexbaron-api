import { Schema, Document, Connection } from 'mongoose'

export interface IService extends Document {
  serviceCode: string
  division: 'digital' | 'print'
  name: string
  description?: string
  category?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const ServiceSchema = new Schema<IService>({
  serviceCode: { type: String, required: true, unique: true, index: true },
  division: { type: String, enum: ['digital', 'print'], required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  category: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export function createServiceModel(conn: Connection) {
  return conn.model<IService>('Service', ServiceSchema)
}
