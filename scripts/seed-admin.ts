import 'dotenv/config'
import { openBrandConnection } from '../src/utils/database'
import { getDivisionModels } from '../src/models/registry'
import { hashPassword } from '../src/features/admin/services/auth-service'
import { logger } from '../src/utils/logger'
import { runtimeBrand } from '../src/utils/runtime-brand'

const owner = runtimeBrand === 'digital'
  ? { email: 'digital-owner@nexbaron.com', name: 'Digital Owner' }
  : { email: 'print-owner@nexbaron.com', name: 'Print Owner' }

async function seed() {
  const connection = await openBrandConnection()
  const tempPassword = process.env.SEED_ADMIN_PASSWORD
  if (!tempPassword || tempPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be set and contain at least 12 characters')
  }

  const { Staff } = getDivisionModels(runtimeBrand)
  const email = owner.email.toLowerCase().trim()
  const existing = await Staff.findOne({ email })
  if (existing) {
    logger.info(`${runtimeBrand} owner already exists (${email}). Setting password.`)
    existing.passwordHash = await hashPassword(tempPassword)
    existing.role = 'owner'
    existing.division = runtimeBrand
    existing.active = true
    await existing.save()
  } else {
    await Staff.create({
      email,
      passwordHash: await hashPassword(tempPassword),
      name: owner.name,
      role: 'owner',
      division: runtimeBrand,
      active: true,
    })
    logger.info(`Created ${runtimeBrand} owner ${email}`)
  }

  logger.info(`Owner credentials updated for ${email}`)
  await connection.close()
  process.exit(0)
}

seed().catch((e) => {
  logger.error(e)
  process.exit(1)
})
