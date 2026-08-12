import { Schema, Document, Connection } from 'mongoose'

export interface ICustomPlan extends Document {
  division: 'digital' | 'print'
  name: string
  serviceIds: string[]
  addOnIds: string[]
  customerEmail?: string
  status: 'draft' | 'shared'
  createdAt: Date
  updatedAt: Date
}

const CustomPlanSchema = new Schema<ICustomPlan>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    name: { type: String, required: true, trim: true },
    serviceIds: { type: [String], default: [] },
    addOnIds: { type: [String], default: [] },
    customerEmail: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ['draft', 'shared'], default: 'draft' },
  },
  { timestamps: true }
)

CustomPlanSchema.index({ division: 1 })
CustomPlanSchema.index({ division: 1, customerEmail: 1 })

export function createCustomPlanModel(conn: Connection) {
  return conn.model<ICustomPlan>('CustomPlan', CustomPlanSchema)
}
