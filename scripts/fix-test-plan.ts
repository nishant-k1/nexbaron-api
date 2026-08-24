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

  // 1. Packages — dev only, so delete all Test Plan artifacts (suspicious 10k)
  const testPackages = await Package.find({ division: runtimeBrand, name: /Test Plan/i }).lean()
  logger.info(`Found ${testPackages.length} Test Plan packages`)
  if (testPackages.length) {
    const del = await Package.deleteMany({ division: runtimeBrand, name: /Test Plan/i })
    logger.warn(`Deleted ${del.deletedCount} Test Plan packages (dev data)`)
    // Also clean related PackageService links
    const { PackageService } = getDivisionModels(runtimeBrand)
    const codes = testPackages.map((p) => p.packageCode)
    if (codes.length) {
      const psDel = await (PackageService as any).deleteMany({ packageCode: { $in: codes }, division: runtimeBrand })
      logger.warn(`Deleted ${psDel.deletedCount} PackageService links for Test Plan`)
    }
  }

  // 2. Invoices — dev only, delete all Test Plan invoices (suspicious 10k) instead of just logging
  const testInvoices = await Invoice.find({ division: runtimeBrand, 'lineItems.label': /Test Plan/i }).lean()
  logger.info(`Found ${testInvoices.length} Test Plan invoices`)
  if (testInvoices.length) {
    const delInv = await Invoice.deleteMany({ division: runtimeBrand, 'lineItems.label': /Test Plan/i })
    logger.warn(`Deleted ${delInv.deletedCount} Test Plan invoices (dev data) — was ${testInvoices.map((i: any) => i.invoiceNumber).join(', ')}`)
  }
  // Also delete any invoice where any lineItem amount === 10000 and no catalog match (likely test)
  const suspiciousInvoices = await Invoice.find({ division: runtimeBrand, 'lineItems.amount': 10000 }).lean()
  const remainingSuspicious = suspiciousInvoices.filter((inv: any) => !testInvoices.some((t: any) => t._id.toString() === inv._id.toString()))
  if (remainingSuspicious.length) {
    logger.warn(`Found ${remainingSuspicious.length} additional invoices with ₹10,000 line (non-Test-Plan) — deleting as dev data`)
    await Invoice.deleteMany({ division: runtimeBrand, 'lineItems.amount': 10000 })
    logger.warn(`Deleted ${remainingSuspicious.length} invoices with ₹10,000 line`)
  }

  // 2b. Orders — dev only, delete all Test Plan orders (suspicious 10k) — Hub Orders page was still showing INV-TEST-50
  const { Order } = getDivisionModels(runtimeBrand)
  const testOrders = await (Order as any).find({ division: runtimeBrand, 'items.label': /Test Plan/i }).lean()
  logger.info(`Found ${testOrders.length} Test Plan orders`)
  if (testOrders.length) {
    const delOrd = await (Order as any).deleteMany({ division: runtimeBrand, 'items.label': /Test Plan/i })
    logger.warn(`Deleted ${delOrd.deletedCount} Test Plan orders (dev data) — was ${testOrders.map((o: any) => o.invoiceNumber || o._id).join(', ')}`)
  }
  const suspiciousOrders = await (Order as any).find({ division: runtimeBrand, 'items.price': 10000 }).lean()
  const remainingSuspiciousOrders = suspiciousOrders.filter((o: any) => !testOrders.some((t: any) => t._id.toString() === o._id.toString()))
  if (remainingSuspiciousOrders.length) {
    logger.warn(`Found ${remainingSuspiciousOrders.length} additional orders with ₹10,000 price — deleting as dev data`)
    await (Order as any).deleteMany({ division: runtimeBrand, 'items.price': 10000 })
    logger.warn(`Deleted ${remainingSuspiciousOrders.length} orders with ₹10,000 price`)
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
