import { Router } from 'express'
import { PLAN_CATALOG, enrichCatalog } from '../plan-catalog'

export const catalogRouter = Router()

catalogRouter.get('/', (_req, res) => {
  const enriched = enrichCatalog(PLAN_CATALOG)
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json(enriched)
})
