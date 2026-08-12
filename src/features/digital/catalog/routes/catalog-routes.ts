import { Router } from 'express'
import { digitalCatalog, enrichCatalog } from '../catalog'

export const catalogRouter = Router()

catalogRouter.get('/', (_req, res) => {
  const enriched = enrichCatalog(digitalCatalog)
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json(enriched)
})
