import { Schema, Document, Connection } from 'mongoose'

export interface IInvoiceCounter extends Document {
  key: string
  seq: number
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export function createInvoiceCounterModel(conn: Connection) {
  return conn.model<IInvoiceCounter>('InvoiceCounter', InvoiceCounterSchema)
}
