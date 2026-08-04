import 'dotenv/config'
import { connectDatabase } from '../src/utils/database'
import { Staff } from '../src/features/admin/models/staff.model'
import { hashPassword } from '../src/features/admin/services/auth-service'
import { logger } from '../src/utils/logger'

async function seed() {
  await connectDatabase()
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@nexbaron.com').toLowerCase().trim()
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin12345'

  const existing = await Staff.findOne({ email })
  if (existing) {
    logger.info(`Admin already exists (${email}) — updating password`)
    existing.passwordHash = await hashPassword(password)
    await existing.save()
  } else {
    await Staff.create({
      email,
      passwordHash: await hashPassword(password),
      name: 'Nexbaron Admin',
      role: 'admin',
      division: 'both',
      active: true,
    })
    logger.info(`Created admin ${email}`)
  }
  process.exit(0)
}

seed().catch((e) => {
  logger.error(e)
  process.exit(1)
})