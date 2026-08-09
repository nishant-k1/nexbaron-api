import { Schema, Document, Connection } from 'mongoose'

export interface IChatAttachment {
  url: string
  type: 'image' | 'video' | 'document'
  name: string
  size?: number
}

export interface IChatMessage extends Document {
  division: 'digital' | 'print'
  projectId?: string
  customerId?: string // null for anonymous visitors
  sessionId?: string // anonymous session identifier
  sender: 'customer' | 'agent'
  message: string
  attachments?: IChatAttachment[]
  name?: string // customer name
  phone?: string // for linking anonymous chats to accounts
  email?: string
  isRead: boolean
  lastSeen?: Date
  createdAt: Date
}

const chatMessageSchema = new Schema(
  {
    division: { type: String, required: true, enum: ['digital', 'print'] },
    projectId: { type: String, default: null },
    customerId: { type: String, default: null },
    sessionId: { type: String, default: null },
    sender: { type: String, required: true, enum: ['customer', 'agent'] },
    message: { type: String, default: '' },
    attachments: [{
      url: String,
      type: { type: String, enum: ['image', 'video', 'document'] },
      name: String,
      size: Number,
    }],
    name: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    isRead: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
)

chatMessageSchema.index({ customerId: 1, createdAt: -1 })
chatMessageSchema.index({ sessionId: 1, createdAt: -1 })
chatMessageSchema.index({ division: 1, isRead: 1 })

export function createChatMessageModel(conn: Connection) {
  return conn.model<IChatMessage>('ChatMessage', chatMessageSchema)
}
