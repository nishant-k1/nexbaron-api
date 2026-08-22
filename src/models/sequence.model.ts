import { Schema, Document, Connection } from 'mongoose'

export interface ISequence extends Document {
  key: string
  seq: number
}

const SequenceSchema = new Schema<ISequence>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
})

export function createSequenceModel(conn: Connection) {
  return conn.model<ISequence>('Sequence', SequenceSchema)
}
