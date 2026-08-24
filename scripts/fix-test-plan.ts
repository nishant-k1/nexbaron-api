import 'dotenv/config'
import { openBrandConnection } from '../src/utils/database'
import { getDivisionModels } from '../src/models/registry'
import { runtimeBrand } from '../src/utils/runtime-brand'
import { logger } from '../src/utils/logger'

/**
 * Fix Test Plan artifacts where recurringFee/oneTimeFee = 10000 (no catalog plan has this).
 * Catalog: starter 599/mo, launch 999/mo, grow 2999/mo, scale 5999/mo.
 * Test Plan with 10k is likely CUSTOM that was mistakenly left as STANDARD or used for QA.
 *
 * This script:
 * - Finds packages named /Test Plan/i with suspicious fees and converts to CUSTOM or corrects to catalog
 * - Finds invoices with lineItems containing "Test Plan" and logs them for manual review (does not auto-fix amounts to avoid financial drift)
 *
 * Run: BRAND=digital npx tsx scripts/fix-test-plan.ts  (or print)
 */

async function fix() {
  const connection = await openBrandConnection()
  const { Package, Invoice } = getDivisionModels(runtimeBrand)

  logger.info(`Fixing Test Plan artifacts for division ${runtimeBrand}...`)

  // 1. Packages
  const testPackages = await Package.find({ division: runtimeBrand, name: /Test Plan/i }).lean()
  logger.info(`Found ${testPackages.length} Test Plan packages`)

  for (const pkg of testPackages) {
    const hasSuspiciousRecurring = pkg.recurringFee === 10000
    const hasSuspiciousOneTime = pkg.oneTimeFee === 10000
    if (!hasSuspiciousRecurring && !hasSuspiciousOneTime) {
      logger.info(`Skipping ${pkg.packageCode} — fees look catalog-correct (oneTime:${pkg.oneTimeFee} recurring:${pkg.recurringFee})`)
      continue
    }
    // If STANDARD with 10k, convert to CUSTOM and keep fees (preserve data, fix type)
    // If you prefer to correct to catalog, set recurringFee to 999 (Launch monthly) etc.
    // Here we convert to CUSTOM and log for manual decision
    const update: any = {}
    if (pkg.type !== 'CUSTOM') {
      update.type = 'CUSTOM'
      update.visibility = 'DRAFT' // quarantine test data
      logger.warn(`Converting ${pkg.packageCode} (${pkg.name}) from ${pkg.type} to CUSTOM and DRAFT due to suspicious fees`)
    }
    if (Object.keys(update).length) {
      await Package.updateOne({ packageCode: pkg.packageCode, division: runtimeBrand }, { $set: update })
      logger.info(`Updated ${pkg.packageCode} → ${JSON.stringify(update)}`)
    }
  }

  // 2. Invoices - just log, don't auto-mutate financial records
  const testInvoices = await Invoice.find({ division: runtimeBrand, 'lineItems.label': /Test Plan/i }).lean()
  logger.info(`Found ${testInvoices.length} Test Plan invoices`)
  for (const inv of testInvoices as any[]) {
    const hasSuspicious = (inv.lineItems || []).some((li: any) => li.amount === 10000)
    if (hasSuspicious) {
      logger.warn(`Invoice ${inv.invoiceNumber} has Test Plan line with ₹10,000 — packageId:${inv.packageId} amount:${inv.amount} lineItems:${JSON.stringify(inv.lineItems)} — manual review needed (should map to catalog 599/999/2999/5999 or be voided)`)
    }
  }

  // 3. General: find any invoice where lineItems sum !== amount (drift from old bug)
  const allInvoices = await Invoice.find({ division: runtimeBrand }).lean()
  let driftCount = 0
  for (const inv of allInvoices as any[]) {
    const sum = (inv.lineItems || []).reduce((s: number, li: any) => s + (li.amount || 0), 0)
    if (sum !== inv.amount) {
      driftCount++
      if (driftCount <= 10) {
        logger.warn(`Drift: ${inv.invoiceNumber} amount ${inv.amount} != lineItems sum ${sum} — lineItems: ${JSON.stringify(inv.lineItems)}`)
      }
    }
  }
  if (driftCount > 10) logger.warn(`... and ${driftCount - 10} more drifted invoices`)
  logger.info(`Drift check: ${driftCount} invoices where amount != sum(lineItems)`)

  logger.info('Done. Review logs and correct Test Plan data in CRM or DB as needed.')
  await connection.close()
  process.exit(0)
}

fix().catch((e) => {
  logger.error(e)
  process.exit(1)
})
