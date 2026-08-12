import { Router } from 'express'
import { PRINT_PRODUCTS, PRINT_STOCK_TIERS, PRINT_FINISHES, PRINT_CATEGORIES } from '../product-catalog'

export const printRouter = Router()

// Public print catalog. No auth required — powers the quote builder and product
// listing pages. Single source of truth for product data, pricing, and display.
printRouter.get('/catalog', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    currency: 'INR',
    categories: PRINT_CATEGORIES,
    products: PRINT_PRODUCTS,
    stockTiers: PRINT_STOCK_TIERS,
    finishes: PRINT_FINISHES,
  })
})

printRouter.get('/status', (req, res) => {
  res.json({ success: true, division: 'print', status: 'available' })
})
