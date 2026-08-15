import 'dotenv/config'
import mongoose, { AnyObject, Connection, Types } from 'mongoose'
import { logger } from '../src/utils/logger'

const COLLECTIONS = [
  'staff',
  'staff_refresh_tokens',
  'users',
  'otps',
  'leads',
  'orders',
  'onboardingdrafts',
  'invoicecounters',
  'quotes',
  'chatmessages',
  'reminders',
  'recurringservices',
  'testimonials',
  'customplans',
]

type Brand = 'digital' | 'print'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function brandFromDocument(doc: AnyObject, staffBrands: Map<string, Brand>): Brand | null {
  if (doc.division === 'digital' || doc.division === 'print') return doc.division
  if (doc.staffId instanceof Types.ObjectId) return staffBrands.get(doc.staffId.toString()) ?? null
  if (typeof doc.key === 'string') {
    if (doc.key.includes('-digital-')) return 'digital'
    if (doc.key.includes('-print-')) return 'print'
  }
  return null
}

async function migrateCollection(
  source: Connection,
  targets: Record<Brand, Connection>,
  name: string,
  staffBrands: Map<string, Brand>,
  apply: boolean
) {
  const counts = { digital: 0, print: 0, ambiguous: 0 }
  const cursor = source.collection(name).find({})

  for await (const doc of cursor) {
    const brand = brandFromDocument(doc, staffBrands)
    if (!brand) {
      counts.ambiguous += 1
      logger.warn(`Skipped ambiguous ${name} document ${String(doc._id)}`)
      continue
    }
    counts[brand] += 1
    if (apply) {
      await targets[brand].collection(name).replaceOne({ _id: doc._id }, doc, { upsert: true })
    }
  }

  logger.info(`${name}: digital=${counts.digital} print=${counts.print} ambiguous=${counts.ambiguous}`)
  return counts.ambiguous
}

async function migrate() {
  const legacyUrl = required('LEGACY_DATABASE_URL')
  const digitalUrl = required('DIGITAL_DATABASE_URL')
  const printUrl = required('PRINT_DATABASE_URL')
  if (new URL(digitalUrl).pathname === new URL(printUrl).pathname) {
    throw new Error('Digital and Print target database names must differ')
  }

  const apply = process.env.MIGRATION_APPLY === 'true'
  logger.info(apply ? 'Applying division database migration' : 'Dry run only; set MIGRATION_APPLY=true to copy data')

  const source = await mongoose.createConnection(legacyUrl).asPromise()
  const digital = await mongoose.createConnection(digitalUrl).asPromise()
  const print = await mongoose.createConnection(printUrl).asPromise()

  try {
    const staffBrands = new Map<string, Brand>()
    for await (const staff of source.collection('staff').find({})) {
      if (staff.division === 'digital' || staff.division === 'print') {
        staffBrands.set(String(staff._id), staff.division)
      }
    }

    let ambiguous = 0
    for (const name of COLLECTIONS) {
      ambiguous += await migrateCollection(source, { digital, print }, name, staffBrands, apply)
    }
    if (ambiguous > 0) {
      throw new Error(`${ambiguous} ambiguous documents were not migrated; classify them before cutover`)
    }
    logger.info(apply ? 'Migration complete' : 'Dry run complete with no ambiguous documents')
  } finally {
    await Promise.all([source.close(), digital.close(), print.close()])
  }
}

migrate().catch((error) => {
  logger.error('Migration failed', error)
  process.exit(1)
})
