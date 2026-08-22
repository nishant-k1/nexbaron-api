import 'dotenv/config'
import mongoose, { Connection } from 'mongoose'
import { logger } from '../src/utils/logger'
import { createPackageModel } from '../src/models/package.model'
import { createPackageServiceModel } from '../src/models/package-service.model'
import { createServiceModel } from '../src/models/service.model'

type Brand = 'digital' | 'print'

function dbUri(brand: Brand): string {
  const specific = process.env[`DATABASE_URL_${brand.toUpperCase()}`]
  const fallback = process.env.DATABASE_URL
  const uri = specific || fallback
  if (!uri) throw new Error(`No database URI configured for ${brand}`)
  return uri
}

async function migrateBrand(brand: Brand, apply: boolean) {
  const uri = dbUri(brand)
  const conn = await mongoose.createConnection(uri).asPromise()
  try {
    const Package = createPackageModel(conn)
    const PackageService = createPackageServiceModel(conn)
    const Service = createServiceModel(conn)

    const serviceDocs = await Service.find({ division: brand }).lean()
    const serviceSet = new Set(serviceDocs.map((s) => s.serviceCode))

    const rawColl = conn.collection('packages')
    const docs = await rawColl
      .find({ division: brand, services: { $exists: true, $ne: [] } })
      .toArray()

    const problems: string[] = []
    for (const doc of docs) {
      const services = (doc.services as Array<{ serviceCode: string }>) || []
      for (const s of services) {
        if (!serviceSet.has(s.serviceCode)) {
          problems.push(`${doc.packageCode}:${s.serviceCode}`)
        }
      }
    }

    if (problems.length) {
      logger.error(
        `[${brand}] ${problems.length} unresolvable service code(s): ${problems.join(', ')}`
      )
      throw new Error(
        `[${brand}] Aborting: cannot map every embedded service to a Service catalog record`
      )
    }

    if (!apply) {
      logger.info(`[${brand}] dry-run: ${docs.length} package(s) would be migrated`)
      return
    }

    for (const doc of docs) {
      const services = (doc.services as Array<{ serviceCode: string; name?: string; description?: string }>) || []
      for (const s of services) {
        await PackageService.updateOne(
          { packageCode: doc.packageCode, serviceCode: s.serviceCode, division: brand },
          { $set: { name: s.name ?? '', description: s.description ?? '' } },
          { upsert: true }
        )
      }
    }

    const unsetRes = await rawColl.updateMany(
      { division: brand },
      { $unset: { services: '' } }
    )
    logger.info(
      `[${brand}] migrated ${docs.length} package(s); unset embedded services on ${unsetRes.modifiedCount} doc(s)`
    )
  } finally {
    await conn.close()
  }
}

async function run() {
  const apply = process.env.MIGRATION_APPLY === 'true'
  logger.info(apply ? 'Applying PackageService migration' : 'Dry run; set MIGRATION_APPLY=true to apply')
  await migrateBrand('digital', apply)
  if (dbUri('digital') !== dbUri('print')) {
    await migrateBrand('print', apply)
  } else {
    logger.info('digital and print URIs are identical; print pass skipped')
  }
  logger.info('PackageService migration complete')
}

run().catch((error) => {
  logger.error('Migration failed', error)
  process.exit(1)
})
