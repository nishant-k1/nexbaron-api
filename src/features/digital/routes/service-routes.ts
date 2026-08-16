import { Router } from 'express'
import { getCanonicalPublicServiceSections, getCanonicalPublicServices } from '../content/service-sections'

export const serviceRouter = Router()

// Public catalog of the services we offer — powers the "services/solutions"
// page. The only source of truth for public service names is:
// - content/service-areas/engineering.ts
// - content/service-areas/marketing.ts
// Prices and internal cost breakdown are intentionally omitted here.
serviceRouter.get('/services', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    sections: getCanonicalPublicServiceSections(),
    services: getCanonicalPublicServices(),
  })
})
