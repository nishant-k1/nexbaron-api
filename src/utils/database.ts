import mongoose, { Connection } from 'mongoose'
import { logger } from './logger'
import { registerDivisionModels } from '../models/registry'

export interface DivisionConnections {
  digital: Connection
  print: Connection
}

function uriFor(database: string): string {
  const configured = (process.env[`DATABASE_URL_${database.toUpperCase()}`] ||
    process.env.DATABASE_URL) as string | undefined
  if (!configured) {
    throw new Error(`DATABASE_URL_${database.toUpperCase()} (or DATABASE_URL) is not set`)
  }
  return configured
}

export async function openDivisionConnections(): Promise<DivisionConnections> {
  const digital = await mongoose.createConnection(uriFor('digital')).asPromise()
  registerDivisionModels('digital', digital)
  logger.info('Connected to MongoDB (digital)')

  const print = await mongoose.createConnection(uriFor('print')).asPromise()
  registerDivisionModels('print', print)
  logger.info('Connected to MongoDB (print)')

  return { digital, print }
}

export async function closeDivisionConnections(connections: DivisionConnections): Promise<void> {
  await Promise.all([
    connections.digital.close(),
    connections.print.close(),
  ])
  logger.info('Disconnected from MongoDB')
}