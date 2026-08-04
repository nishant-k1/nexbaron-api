import type { Request, Response } from 'express'
import { app } from '../src/express-app'
import { connectDatabase } from '../src/utils/database'

let dbConnection: Promise<void> | null = null

function ensureDb(): Promise<void> {
  if (!dbConnection) {
    dbConnection = connectDatabase().catch((err) => {
      dbConnection = null
      throw err
    })
  }
  return dbConnection
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
