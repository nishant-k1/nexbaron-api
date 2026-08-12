import { Router } from 'express'
import { BUSINESS_CATEGORIES, getBusinesses, getBusinessBySlug } from '../business-catalog'

export const businessRouter = Router()

// Public catalog of the businesses we serve — powers the "Who We Help" pages.
businessRouter.get('/businesses', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    categories: BUSINESS_CATEGORIES,
    businesses: getBusinesses(),
  })
})

businessRouter.get('/businesses/:slug', (req, res) => {
  const business = getBusinessBySlug(req.params.slug)
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' })
    return
  }
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, business })
})
