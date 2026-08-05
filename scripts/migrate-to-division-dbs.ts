import 'dotenv/config'
import mongoose from 'mongoose'
import { logger } from '../src/utils/logger'

/**
 * Copies records from the legacy single `nexbaron` database into the two
 * division databases (`nexbaron-digital`, `nexbaron-print`) based on each
 * document's `division` field. Idempotent: documents already present in the
 * target (matched by _id) are skipped.
 */

const COLLECTIONS = ['leads', 'orders', 'staff', 'staff_refresh_tokens', 'users', 'otps', 'onboarding_drafts']

function baseUri(): string {
  const uri = (process.env.DATABASE_URL || process.env.MONGODB_URI) as string | undefined
  if (!uri) throw new Error('DATABASE_URL is not set')
  return uri
}

async function copyCollection(conn: mongoose.Connection, name: string) {
  const src = conn.collection(name)
  const count = await src.countDocuments()
  if (count === 0) return
  logger.info(`  ${name}: ${count} docs`)

  const digital = await mongoose.createConnection(baseUri().replace(/\/nexbaron\?/, '/nexbaron-digital?')).asPromise()
  const print = await mongoose.createConnection(baseUri().replace(/\/nexbaron\?/, '/nexbaron-print?')).asPromise()
  const digitalCol = digital.collection(name)
  const printCol = print.collection(name)

  let copied = 0
  let skipped = 0
  const cursor = src.find({})

  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    if (!doc) break
    const division = doc.division === 'print' ? 'print' : 'digital'
    const target = division === 'print' ? printCol : digitalCol
    const existing = await target.findOne({ _id: doc._id })
    if (existing) {
      skipped += 1
      continue
    }
    const copy = { ...doc }
    delete copy._id
    await target.insertOne({ ...copy, _id: doc._id })
    copied += 1
  }

  await digital.close()
  await print.close()
  logger.info(`  ${name}: copied=${copied} skipped=${skipped}`)
}

async function migrate() {
  logger.info('Connecting to legacy nexbaron DB…')
  const conn = await mongoose.createConnection(baseUri()).asPromise()

  for (const name of COLLECTIONS) {
    await copyCollection(conn, name)
  }

  await conn.close()
  logger.info('Migration complete')
  process.exit(0)
}

migrate().catch((e) => {
  logger.error(e)
  process.exit(1)
})