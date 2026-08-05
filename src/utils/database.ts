import mongoose, { Connection } from 'mongoose'
import { logger } from './logger'
import { registerDivisionModels } from '../models/registry'
import { runtimeBrand } from './runtime-brand'

function databaseUri(): string {
  const localOverride = process.env[`DATABASE_URL_${runtimeBrand.toUpperCase()}`]
  const configured = process.env.DATABASE_URL || localOverride
  if (!configured) {
    throw new Error(`DATABASE_URL (or DATABASE_URL_${runtimeBrand.toUpperCase()}) is not set`)
  }
  return configured
}

export async function openBrandConnection(): Promise<Connection> {
  const connection = await mongoose.createConnection(databaseUri()).asPromise()
  registerDivisionModels(runtimeBrand, connection)
  logger.info(`Connected to MongoDB (${runtimeBrand})`)
  return connection
}

export async function closeBrandConnection(connection: Connection): Promise<void> {
  await connection.close()
  logger.info('Disconnected from MongoDB')
}
