import { Model } from 'mongoose'

// Generic entity-code counter, kept SEPARATE from InvoiceCounter (which is
// invoice-numbering only). Dedicated to human-readable codes like ACC-/PKG-/SVC-.
export async function nextCode(model: Model<any>, key: string, prefix: string): Promise<string> {
  const doc = await model.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return `${prefix}-${String(doc.seq).padStart(4, '0')}`
}
