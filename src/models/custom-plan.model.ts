import { Schema, Document, Connection } from 'mongoose'

export interface ICustomPlanService {
  id: string
  label: string
  price: number
  type: 'oneTime' | 'monthly'
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
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['oneTime', 'monthly'], required: true },
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
