import type { Request, Response } from 'express'
import { app } from '../src/express-app'
import { openDivisionConnections } from '../src/utils/database'
import type { DivisionConnections } from '../src/utils/database'

let dbPromise: Promise<DivisionConnections> | null = null

function ensureDb(): Promise<DivisionConnections> {
  if (!dbPromise) {
    dbPromise = openDivisionConnections().catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

export default async function handler(req: Request, res: Response) {
  try {
    await ensureDb()
  } catch {
    res.status(500).json({ success: false, message: 'Database connection failed' })
    return
  }
  return app(req, res)
}