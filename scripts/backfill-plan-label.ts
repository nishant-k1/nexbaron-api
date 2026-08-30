import 'dotenv/config'
import { MongoClient } from 'mongodb'

const url = process.env.DATABASE_URL_DIGITAL || process.env.DATABASE_URL
if (!url) {
  console.error('No DATABASE_URL found. Check your .env file.')
  process.exit(1)
}

// Plan ID → display name mapping (from catalog)
const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  launch: 'Launch',
  growth: 'Growth',
  scale: 'Scale',
  custom: 'Custom',
}

async function backfill() {
  const client = new MongoClient(url!)
  await client.connect()
  const db = client.db()
  const orders = db.collection('orders')

  const docs = await orders.find({ planLabel: { $exists: false } }).toArray()
  console.log(`Found ${docs.length} orders without planLabel`)

  for (const doc of docs) {
    const serviceId = doc.service as string | undefined
    const planLabel = serviceId ? (PLAN_LABELS[serviceId] || serviceId) : undefined
    if (planLabel) {
      await orders.updateOne({ _id: doc._id }, { $set: { planLabel } })
      console.log(`  ${doc._id}: service="${serviceId}" → planLabel="${planLabel}"`)
    } else {
      console.log(`  ${doc._id}: no service field, skipping`)
    }
  }

  // Verify
  const all = await orders.find({}, { projection: { service: 1, planLabel: 1 } }).toArray()
  console.log('\nFinal state:')
  for (const d of all) {
    console.log(`  ${d._id}: service="${d.service}", planLabel="${d.planLabel}"`)
  }

  await client.close()
  console.log('Done.')
}

backfill().catch(console.error)
