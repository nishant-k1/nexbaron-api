import { Schema, Document, Connection, Types } from 'mongoose'

export interface ITestimonial extends Document {
  division: 'digital' | 'print'
  projectId: string
  orderId: string
  quote: string
  author: {
    name: string
    company?: string
    role?: string
  }
  rating: number
  tags: string[]
  approved: boolean
  source: 'review' | 'direct' | 'chat' | 'email'
  createdAt: Date
  updatedAt: Date
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    division: { type: String, enum: ['digital', 'print'], required: true },
    projectId: { type: String, required: true },
    orderId: { type: String, required: true },
    quote: { type: String, required: true, trim: true, maxlength: 500 },
    author: {
      name: { type: String, required: true, trim: true },
      company: { type: String, trim: true },
      role: { type: String, trim: true },
    },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    tags: { type: [String], default: [] },
    approved: { type: Boolean, default: false },
    source: { type: String, enum: ['review', 'direct', 'chat', 'email'], default: 'direct' },
  },
  { timestamps: true }
)

TestimonialSchema.index({ division: 1, approved: 1 })
TestimonialSchema.index({ tags: 1 })
TestimonialSchema.index({ projectId: 1 })

export function createTestimonialModel(conn: Connection) {
  return conn.model<ITestimonial>('Testimonial', TestimonialSchema)
}
