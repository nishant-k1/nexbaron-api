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

interface DupReport {
  division: Brand
  userId: string
  count: number
  accountCodes: string[]
}

async function findDuplicates(brand: Brand): Promise<DupReport[]> {
  const conn = await mongoose.createConnection(dbUri(brand)).asPromise()
  try {
    const coll = conn.collection('accounts')
    const cursor = coll.aggregate<DupReport>([
      { $match: { userId: { $ne: null } } },
      {
        $group: {
          _id: { division: '$division', database: brand, userId: '$userId' },
          count: { $sum: 1 },
          accountCodes: { $push: '$accountCode' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, division: '$_id.division', userId: '$_id.userId', count: 1, accountCodes: 1 } },
    ])
    const results: DupReport[] = []
    for await (const doc of cursor) results.push(doc)
    return results
  } finally {
    await conn.close()
  }
}

async function run() {
  const reports = await findDuplicates('digital')
  if (dbUri('digital') !== dbUri('print')) {
    reports.push(...(await findDuplicates('print')))
  }

  if (reports.length === 0) {
    logger.info('No duplicate Accounts found for (division, userId). Unique constraint is safe to apply.')
    return
  }

  const lines = reports.map(
    (r) => `  ${r.division}  userId=${r.userId}  count=${r.count}  codes=[${r.accountCodes.join(', ')}]`
  )
  logger.error(
    `Found ${reports.length} user(s) with multiple Accounts — DO NOT auto-merge/delete.\n` +
      'Manual resolution required before the unique (division, userId) index can be built:\n' +
      lines.join('\n')
  )
  process.exit(2)
}

run().catch((error) => {
  logger.error('Duplicate Account check failed', error)
  process.exit(1)
})
