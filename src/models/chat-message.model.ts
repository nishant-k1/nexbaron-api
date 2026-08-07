import { Schema, Document, Connection } from 'mongoose'

export interface IChatMessage extends Document {
  division: 'digital' | 'print'
  customerId?: string // null for anonymous visitors
  sessionId?: string // anonymous session identifier
  sender: 'customer' | 'agent'
  message: string
  name?: string // customer name
  phone?: string // for linking anonymous chats to accounts
  email?: string
  isRead: boolean
  createdAt: Date
}

const chatMessageSchema = new Schema(
  {
    division: { type: String, required: true, enum: ['digital', 'print'] },
    customerId: { type: String, default: null },
    sessionId: { type: String, default: null },
    sender: { type: String, required: true, enum: ['customer', 'agent'] },
    message: { type: String, required: true },
    name: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

chatMessageSchema.index({ customerId: 1, createdAt: -1 })
chatMessageSchema.index({ sessionId: 1, createdAt: -1 })
chatMessageSchema.index({ division: 1, isRead: 1 })

export function createChatMessageModel(conn: Connection) {
  return conn.model<IChatMessage>('ChatMessage', chatMessageSchema)
}
