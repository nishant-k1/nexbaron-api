import mongoose, { Schema, Document } from 'mongoose'

export interface IContact extends Document {
  name: string
  email: string
  phone?: string
  company?: string
  subject: string
  message: string
  createdAt: Date
  updatedAt: Date
}

const ContactSchema = new Schema<IContact>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
    },
  },
  {
    timestamps: true,
  }
)

ContactSchema.index({ email: 1 })
ContactSchema.index({ createdAt: -1 })

export const Contact = mongoose.model<IContact>('Contact', ContactSchema)

