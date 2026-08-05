import { Router } from 'express'
import { PRINT_PRODUCTS, PRINT_STOCK_TIERS, PRINT_FINISHES } from '../catalog'

export const printRouter = Router()

// Public print catalog. No auth required — powers the quote builder and is the
// single source of truth for product options and stock/finish pricing.
printRouter.get('/catalog', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    currency: 'INR',
    products: PRINT_PRODUCTS,
    stockTiers: PRINT_STOCK_TIERS,
    finishes: PRINT_FINISHES,
  })
})

printRouter.get('/status', (req, res) => {
  res.json({ success: true, division: 'print', status: 'available' })
})
