import 'dotenv/config'
import mongoose from 'mongoose'
import { openDivisionConnections } from '../src/utils/database'
import type { DivisionConnections } from '../src/utils/database'
import { getDivisionModels } from '../src/models/registry'
import { hashPassword } from '../src/features/admin/services/auth-service'
import { logger } from '../src/utils/logger'

const OWNERS: Array<{ email: string; name: string; division: 'digital' | 'print' }> = [
  { email: 'digital-owner@nexbaron.com', name: 'Digital Owner', division: 'digital' },
  { email: 'print-owner@nexbaron.com', name: 'Print Owner', division: 'print' },
]

async function seed() {
  const connections: DivisionConnections = await openDivisionConnections()
  const tempPassword = process.env.SEED_ADMIN_PASSWORD || 'admin12345'

  for (const owner of OWNERS) {
    const { Staff } = getDivisionModels(owner.division)
    const email = owner.email.toLowerCase().trim()
    const existing = await Staff.findOne({ email })
    if (existing) {
      logger.info(`${owner.division} owner already exists (${email}). Setting password.`)
      existing.passwordHash = await hashPassword(tempPassword)
      existing.role = 'owner'
      existing.division = owner.division
      existing.active = true
      await existing.save()
    } else {
      await Staff.create({
        email,
        passwordHash: await hashPassword(tempPassword),
        name: owner.name,
        role: 'owner',
        division: owner.division,
        active: true,
      })
      logger.info(`Created ${owner.division} owner ${email}`)
    }
  }

  logger.info(`Temp password for owners: ${tempPassword}`)
  await Promise.all([connections.digital.close(), connections.print.close()])
  void mongoose
  process.exit(0)
}

seed().catch((e) => {
  logger.error(e)
  process.exit(1)
})