import { Router } from 'express'
import { digitalCatalog } from '../catalog'

export const catalogRouter = Router()

// Public catalog of digital plans. No auth required — it powers the pricing
// page, checkout, and serves as the single source of truth for prices/services.
catalogRouter.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json(digitalCatalog)
})