import type { Request, Response } from 'express'
import { app } from '../src/express-app'
import { openBrandConnection } from '../src/utils/database'
import type { Connection } from 'mongoose'

let dbPromise: Promise<Connection> | null = null

function ensureDb(): Promise<Connection> {
  if (!dbPromise) {
    dbPromise = openBrandConnection().catch((err) => {
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
