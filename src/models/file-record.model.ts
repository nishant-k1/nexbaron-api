import mongoose, { Schema, Document } from 'mongoose'

export interface IFileRecord extends Document {
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  uploadedBy?: string
  createdAt: Date
  updatedAt: Date
}

const FileRecordSchema = new Schema<IFileRecord>(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    path: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

FileRecordSchema.index({ createdAt: -1 })

export const FileRecord = mongoose.model<IFileRecord>('FileRecord', FileRecordSchema)

