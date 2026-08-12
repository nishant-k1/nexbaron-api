import { Schema, Document, Connection } from 'mongoose'
import { BillingCycle } from '../orders/models/order.model'

export interface ICustomPlanService {
  id: string
  service: {
    label: string
  }
  price: number
  billingCycle: BillingCycle
  unitLabel?: string
}

export interface ICustomPlan extends Document {
  division: 'digital' | 'print'
  name: string
  services: ICustomPlanService[]
  addOns: ICustomPlanService[]
  createdAt: Date
  updatedAt: Date
}

const CustomPlanServiceSchema = new Schema<ICustomPlanService>(
  {
    id: { type: String, required: true, trim: true },
    service: {
      label: { type: String, required: true, trim: true },
    },
    price: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ['setup', 'monthly', 'annual'], required: true },
    unitLabel: { type: String, trim: true },
  },
  { _id: false }
)

const CustomPlanSchema = new Schema<ICustomPlan>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    name: { type: String, required: true, trim: true },
    services: { type: [CustomPlanServiceSchema], default: [] },
    addOns: { type: [CustomPlanServiceSchema], default: [] },
  },
  { timestamps: true }
)

CustomPlanSchema.index({ division: 1 })

export function createCustomPlanModel(conn: Connection) {
  return conn.model<ICustomPlan>('CustomPlan', CustomPlanSchema)
}
