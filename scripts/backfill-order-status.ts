import 'dotenv/config'
import { MongoClient } from 'mongodb'

const url = process.env.DATABASE_URL_DIGITAL || process.env.DATABASE_URL
if (!url) {
  console.error('No DATABASE_URL found. Check your .env file.')
  process.exit(1)
}

async function backfill() {
  const client = new MongoClient(url!)
  await client.connect()
  const db = client.db()
  const orders = db.collection('orders')

  // Map old status values to 'active'
  const result1 = await orders.updateMany(
    { status: { $in: ['pending', 'confirmed', 'in_progress', 'new', 'paid', 'delivered'] } },
    { $set: { status: 'active' } }
  )
  console.log(`Updated ${result1.modifiedCount} orders to status "active"`)

  // cancelled stays cancelled

  // Backfill stageHistory entries
  const bulkOps = [
    { updateMany: { filter: { 'stageHistory.stage': 'pending' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
    { updateMany: { filter: { 'stageHistory.stage': 'confirmed' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
    { updateMany: { filter: { 'stageHistory.stage': 'in_progress' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
    { updateMany: { filter: { 'stageHistory.stage': 'new' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
    { updateMany: { filter: { 'stageHistory.stage': 'paid' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
    { updateMany: { filter: { 'stageHistory.stage': 'delivered' }, update: { $set: { 'stageHistory.$.stage': 'active' } } } },
  ]
  const stageResult = await orders.bulkWrite(bulkOps)
  console.log(`Updated ${stageResult.modifiedCounts} stageHistory entries`)

  // Verify final state
  const docs = await orders.find({}, { projection: { status: 1, stageHistory: 1 } }).toArray()
  for (const d of docs) {
    console.log(`  ${d._id}: status=${d.status}, stages=[${d.stageHistory?.map((s: any) => s.stage).join(', ')}]`)
  }

  await client.close()
  console.log('Done.')
}

backfill().catch(console.error)
