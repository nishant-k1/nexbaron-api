import { Router } from 'express'
import { DIGITAL_BUSINESS_PROFILE } from '../business-profile'

export const businessProfileRouter = Router()

// Our own business profile (NAP, geo, hours, service area) — the single source
// of truth for Nexbaron Digital's local SEO data. Distinct from
// business-routes.ts, which serves the who-we-help catalog of *customer*
// businesses.
businessProfileRouter.get('/business', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, profile: DIGITAL_BUSINESS_PROFILE })
})
