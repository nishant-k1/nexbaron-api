import { Router } from 'express'
import { SERVICE_SECTIONS, getPublicServices } from '../service-catalog'

export const serviceRouter = Router()

// Public catalog of the services we offer — powers the "services/solutions"
// page. Prices and internal cost breakdown are intentionally omitted here.
serviceRouter.get('/services', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    sections: SERVICE_SECTIONS,
    services: getPublicServices(),
  })
})
