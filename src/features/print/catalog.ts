// Server-side print catalog — the single source of truth for print quote
// pricing. Mirrors the options on the web quote builder so the server can
// recompute an estimate instead of trusting the client.

export interface PrintProduct {
  id: string
  label: string
  basePrice: number // per 500 units
  minQuantity: number
}

export interface PrintStockTier {
  id: string
  label: string
  extra: number
}

export interface PrintFinish {
  id: string
  label: string
  extra: number
}

export const PRINT_PRODUCTS: PrintProduct[] = [
  { id: 'visiting-cards', label: 'Visiting Cards', basePrice: 499, minQuantity: 500 },
  { id: 'card-holders', label: 'Card Holders', basePrice: 799, minQuantity: 500 },
  { id: 'pamphlets-posters', label: 'Pamphlets & Posters', basePrice: 1499, minQuantity: 500 },
  { id: 'tags', label: 'Tags', basePrice: 599, minQuantity: 500 },
  { id: 'files', label: 'Files', basePrice: 999, minQuantity: 500 },
  { id: 'letter-heads', label: 'Letter Heads', basePrice: 899, minQuantity: 500 },
  { id: 'envelopes', label: 'Envelopes', basePrice: 899, minQuantity: 500 },
  { id: 'digital-paper-printing', label: 'Digital Paper Printing', basePrice: 499, minQuantity: 500 },
  { id: 'atm-pouches', label: 'ATM Pouches', basePrice: 1199, minQuantity: 500 },
  { id: 'bill-books', label: 'Bill Books', basePrice: 1499, minQuantity: 500 },
  { id: 'stickers-labels', label: 'Stickers & Labels', basePrice: 799, minQuantity: 500 },
  { id: 'pens', label: 'Pens', basePrice: 1999, minQuantity: 500 },
  { id: 'shooting-targets', label: 'Shooting Targets', basePrice: 999, minQuantity: 500 },
  { id: 'sample-files', label: 'Sample Files', basePrice: 1499, minQuantity: 500 },
]

export const PRINT_STOCK_TIERS: PrintStockTier[] = [
  { id: 'standard', label: 'Standard Stock', extra: 0 },
  { id: 'premium', label: 'Premium Stock', extra: 300 },
  { id: 'luxury', label: 'Luxury / Specialty', extra: 500 },
]

export const PRINT_FINISHES: PrintFinish[] = [
  { id: 'none', label: 'Standard', extra: 0 },
  { id: 'spot-uv', label: 'Spot UV', extra: 400 },
  { id: 'gold-foil', label: 'Gold Foil', extra: 400 },
]

export function computePrintEstimate(input: {
  product?: string
  quantity?: number
  stock?: string
  finishing?: string
}): { estimatedPrice: number; productLabel: string; stockLabel: string; finishLabel: string } {
  const product =
    PRINT_PRODUCTS.find((p) => p.id === input.product) ?? PRINT_PRODUCTS[0]!
  const quantity = Math.max(input.quantity || product.minQuantity, product.minQuantity)
  const stock = PRINT_STOCK_TIERS.find((s) => s.id === input.stock) ?? PRINT_STOCK_TIERS[0]!
  const finish = PRINT_FINISHES.find((f) => f.id === input.finishing) ?? PRINT_FINISHES[0]!

  const multiplier = quantity / 500
  const estimatedPrice = Math.round(product.basePrice * multiplier + stock.extra + finish.extra)

  return {
    estimatedPrice,
    productLabel: product.label,
    stockLabel: stock.label,
    finishLabel: finish.label,
  }
}

export function productLabel(productId: string): string {
  return PRINT_PRODUCTS.find((p) => p.id === productId)?.label ?? productId
}
