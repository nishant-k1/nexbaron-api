import { Model } from 'mongoose'

export async function nextSequence(connModel: Model<any>, key: string): Promise<number> {
  const counter = await connModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return counter.seq
}