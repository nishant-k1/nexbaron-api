import 'dotenv/config'
import mongoose from 'mongoose'
import { logger } from '../src/utils/logger'

type Brand = 'digital' | 'print'

function dbUri(brand: Brand): string {
  const specific = process.env[`DATABASE_URL_${brand.toUpperCase()}`]
  const fallback = process.env.DATABASE_URL
  const uri = specific || fallback
  if (!uri) throw new Error(`No database URI configured for ${brand}`)
  return uri
}

interface LeadOp {
  _id: mongoose.Types.ObjectId
  action: 'unset' | 'set'
  value?: string
}

async function collectBrand(brand: Brand): Promise<{ problems: string[]; ops: LeadOp[] }> {
  const conn = await mongoose.createConnection(dbUri(brand)).asPromise()
  const problems: string[] = []
  const ops: LeadOp[] = []
  try {
    const coll = conn.collection('leads')
    const cursor = coll.find({ accountId: { $exists: true, $ne: null } })
    for await (const doc of cursor) {
      const val = doc.accountId
      if (Array.isArray(val)) {
        if (val.length === 0) {
          ops.push({ _id: doc._id, action: 'unset' })
        } else if (val.length === 1) {
          ops.push({ _id: doc._id, action: 'set', value: String(val[0]) })
        } else {
          problems.push(`${String(doc._id)} -> [${val.join(', ')}]`)
        }
      } else if (typeof val === 'string') {
        // already scalar, no change
      } else {
        ops.push({ _id: doc._id, action: 'unset' })
      }
    }
  } finally {
    await conn.close()
  }
  return { problems, ops }
}

async function applyBrand(brand: Brand, ops: LeadOp[]) {
  if (!ops.length) {
    logger.info(`[${brand}] no Lead.accountId conversions needed`)
    return
  }
  const conn = await mongoose.createConnection(dbUri(brand)).asPromise()
  try {
    const coll = conn.collection('leads')
    for (const op of ops) {
      if (op.action === 'unset') {
        await coll.updateOne({ _id: op._id }, { $unset: { accountId: '' } })
      } else {
        await coll.updateOne({ _id: op._id }, { $set: { accountId: op.value } })
      }
    }
    logger.info(`[${brand}] converted ${ops.length} Lead.accountId value(s) to scalar`)
  } finally {
    await conn.close()
  }
}

async function run() {
  logger.info('Inspecting Lead.accountId for scalar conversion')
  const digital = await collectBrand('digital')
  const print = dbUri('digital') !== dbUri('print') ? await collectBrand('print') : { problems: [], ops: [] }

  const allProblems = [...digital.problems, ...print.problems]
  if (allProblems.length) {
    logger.error(
      `Cannot convert automatically; ${allProblems.length} Lead(s) have multiple account IDs:\n` +
        allProblems.join('\n')
    )
    throw new Error('Manual resolution required for multi-account Leads')
  }

  await applyBrand('digital', digital.ops)
  if (dbUri('digital') !== dbUri('print')) {
    await applyBrand('print', print.ops)
  }
  logger.info('Lead.accountId migration complete')
}

run().catch((error) => {
  logger.error('Migration failed', error)
  process.exit(1)
})
