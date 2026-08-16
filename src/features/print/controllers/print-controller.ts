import { Request, Response } from 'express'
import { PRINT_PRODUCTS, PRINT_STOCK_TIERS, PRINT_FINISHES, PRINT_CATEGORIES } from '../catalog/products'
import { PRINT_BUSINESS_PROFILE } from '../catalog/business-profile'

export function getPrintCatalog(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    currency: 'INR',
    categories: PRINT_CATEGORIES,
    products: PRINT_PRODUCTS,
    stockTiers: PRINT_STOCK_TIERS,
    finishes: PRINT_FINISHES,
  })
}

export function getPrintStatus(_req: Request, res: Response) {
  res.json({ success: true, division: 'print', status: 'available' })
}

export function getPrintBusinessProfile(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, profile: PRINT_BUSINESS_PROFILE })
}
