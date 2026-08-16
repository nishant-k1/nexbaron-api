import { Router } from 'express'
import { PRINT_BUSINESS_PROFILE } from '../content/business-profile'

export const printBusinessProfileRouter = Router()

// Our own business profile (NAP, geo, hours, service area) — the single source
// of truth for Nexbaron Print's local SEO data.
printBusinessProfileRouter.get('/business', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, profile: PRINT_BUSINESS_PROFILE })
})
