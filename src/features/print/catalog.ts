// Server-side print catalog — the single source of truth for both pricing
// and display data. Powers the quote builder and product listing pages.

export interface PrintProduct {
  id: string
  label: string
  basePrice: number // per 500 units
  minQuantity: number
  // Display fields (served to the web product listing)
  slug: string
  tagline: string
  description: string
  icon: string // Lucide icon name — mapped to component on the client
  category: string
  materials: string[]
  displayFinishes: string[]
  sizes: string[]
  features: string[]
  badge: string
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

export const PRINT_CATEGORIES = [
  'Stationery & Cards',
  'Marketing & Labels',
  'Business & Billing',
  'Specialty Print',
] as const

export const PRINT_PRODUCTS: PrintProduct[] = [
  {
    id: 'visiting-cards', label: 'Visiting Cards', basePrice: 499, minQuantity: 500,
    slug: 'visiting-cards', category: 'Stationery & Cards',
    tagline: 'Your first impression, in print',
    description: 'Premium visiting cards crafted on quality stocks with premium finishes — from spot UV to gold foil — so your business feels established the moment your card is handed over.',
    icon: 'CreditCard',
    materials: ['Premium card stocks (350 GSM class)', 'Matte, gloss & textured surfaces', 'Metallic & linen-look finishes', 'PVC & specialty material options'],
    displayFinishes: ['Spot UV highlighting', 'Gold & silver foil stamping', 'Matte / gloss lamination', 'Embossing & debossing'],
    sizes: ['Standard card size', 'Slim & square formats', 'Custom sizes on request'],
    features: ['Free design check before print', '24-hour express on standard orders', 'Bulk pricing available'],
    badge: 'Most Popular',
  },
  {
    id: 'card-holders', label: 'Card Holders', basePrice: 799, minQuantity: 500,
    slug: 'card-holders', category: 'Stationery & Cards',
    tagline: 'Carry and present cards with class',
    description: 'Printed and branded card holders that keep visiting cards crisp, organized, and ready to present — ideal for sales teams, executives, and corporate gifting.',
    icon: 'Wallet',
    materials: ['Rigid board & premium papers', 'Leatherette & fabric options', 'PVC windowed and slip-on styles'],
    displayFinishes: ['Brand imprint on cover', 'Foil & emboss detailing', 'Lamination for durability'],
    sizes: ['Single & double card capacity', 'Wallet and desk styles', 'Custom branding sizes'],
    features: ['Bulk business gifting pricing', 'Custom logo printing', 'Quick turnaround'],
    badge: 'Corporate Favourite',
  },
  {
    id: 'pamphlets-posters', label: 'Pamphlets & Posters', basePrice: 1499, minQuantity: 500,
    slug: 'pamphlets-posters', category: 'Marketing & Labels',
    tagline: 'Marketing that gets noticed',
    description: 'Vibrant pamphlets, leaflets, and posters printed on quality paper stocks — built to be distributed, posted, and remembered.',
    icon: 'FileText',
    materials: ['Coated art paper & card', 'Matte / silk / gloss stocks', 'Recycled eco-friendly options'],
    displayFinishes: ['Full-color digital & offset print', 'Matte / gloss lamination', 'Folding & creasing'],
    sizes: ['A5, A4, A3 & custom', 'Tri-fold & bi-fold formats', 'Poster sizes on request'],
    features: ['Bulk distribution pricing', 'Print-ready file review included', 'Fast delivery'],
    badge: 'High Volume',
  },
  {
    id: 'stickers-labels', label: 'Stickers & Labels', basePrice: 799, minQuantity: 500,
    slug: 'stickers-labels', category: 'Marketing & Labels',
    tagline: 'Brand every surface',
    description: 'Custom stickers and labels for products, packaging, promotions, and events — die-cut to any shape and finished to withstand daily handling.',
    icon: 'Sparkles',
    materials: ['Vinyl & adhesive label stock', 'Glossy, matte & transparent films', 'Paper & waterproof options'],
    displayFinishes: ['Die-cut custom shapes', 'Lamination (matte / gloss)', 'Weatherproof & removable adhesives'],
    sizes: ['Any shape or size', 'Roll & sheet formats', 'Product, pouch & label sizes'],
    features: ['Custom die-cutting', 'Bulk label pricing', 'Indoor & outdoor options'],
    badge: 'Custom Cut',
  },
  {
    id: 'pens', label: 'Pens', basePrice: 1999, minQuantity: 500,
    slug: 'pens', category: 'Marketing & Labels',
    tagline: 'Giveaways that keep your name in hand',
    description: 'Branded promotional pens with your logo and message printed or engraved — the classic corporate giveaway that keeps working long after the meeting.',
    icon: 'PenTool',
    materials: ['Plastic & metal pen bodies', 'Gel, ballpoint & fountain options', 'Eco-friendly material choices'],
    displayFinishes: ['Logo printing (1-4 colors)', 'Engraving on metal', 'Custom color bodies'],
    sizes: ['Standard & slim profiles', 'Gift-boxed options', 'Bulk event quantities'],
    features: ['Bulk giveaway pricing', 'Corporate & event branding', 'Fast production'],
    badge: 'Promo Classic',
  },
  {
    id: 'sample-files', label: 'Sample Files', basePrice: 1499, minQuantity: 500,
    slug: 'sample-files', category: 'Marketing & Labels',
    tagline: 'Show your range in one place',
    description: 'Printed sample files that showcase your product range, materials, and finishes — the essential sales tool for dealers, distributors, and export teams.',
    icon: 'Copy',
    materials: ['Premium cover stocks', 'Assorted material swatches', 'Ring-bound & stitched options'],
    displayFinishes: ['Custom covers & branding', 'Laminated & foil detailing', 'Pocket & tab layouts'],
    sizes: ['A4 & custom formats', 'Multi-swatch inserts', 'Bound & loose-leaf styles'],
    features: ['Custom swatch selection', 'Business gifting ready', 'Short runs available'],
    badge: 'Sales Tool',
  },
  {
    id: 'letter-heads', label: 'Letter Heads', basePrice: 899, minQuantity: 500,
    slug: 'letter-heads', category: 'Business & Billing',
    tagline: 'Professional correspondence, branded to match your company image',
    description: 'Branded letterheads on premium writing paper that make every official correspondence look considered and professional.',
    icon: 'Mail',
    materials: ['Premium writing paper', 'Watermarked & security stocks', 'Cotton & textured options'],
    displayFinishes: ['Full-color brand printing', 'Embossed & foil branding', 'Standard A4 cut sizes'],
    sizes: ['A4 standard', 'Custom dimensions'],
    features: ['Matches your full brand kit', 'Bulk business pricing', 'Fast reordering'],
    badge: 'Business Essential',
  },
  {
    id: 'envelopes', label: 'Envelopes', basePrice: 899, minQuantity: 500,
    slug: 'envelopes', category: 'Business & Billing',
    tagline: 'Brand the first thing they touch',
    description: 'Branded envelopes in every size — from daily correspondence to premium invitations — printed with your logo and finished for a premium first touch.',
    icon: 'MailOpen',
    materials: ['Kraft & white stocks', 'Premium & security papers', 'Windowed & padded options'],
    displayFinishes: ['Logo & return-address printing', 'Foil & laminated detailing', 'Custom flap styles'],
    sizes: ['DL, A4 & A5 envelopes', 'Document & courier sizes', 'Invitation & gifting formats'],
    features: ['Matches letterheads', 'Bulk office pricing', 'Quick turnaround'],
    badge: 'Business Essential',
  },
  {
    id: 'files', label: 'Files', basePrice: 999, minQuantity: 500,
    slug: 'files', category: 'Business & Billing',
    tagline: 'Organized offices, branded files',
    description: 'Printed office files and folders with your branding — built to organize documents and reinforce your identity in every office and client meeting.',
    icon: 'FolderOpen',
    materials: ['Rigid board & laminated covers', 'Premium paper & pouch folders', 'Expanding & clip styles'],
    displayFinishes: ['Full brand printing', 'Foil & emboss detailing', 'Pocket & gusset options'],
    sizes: ['A4 & legal sizes', 'Standard & expanding files', 'Custom corporate formats'],
    features: ['Bulk office supply pricing', 'Custom branding', 'Corporate kit options'],
    badge: 'Office Ready',
  },
  {
    id: 'tags', label: 'Tags', basePrice: 599, minQuantity: 500,
    slug: 'tags', category: 'Business & Billing',
    tagline: 'Labels, price tags & more',
    description: 'Printed tags for products, pricing, luggage, and events — die-cut, punched, and finished exactly to your specification.',
    icon: 'Tag',
    materials: ['Card & specialty tag stock', 'Rigid & laminated options', 'Plastic & tear-resistant types'],
    displayFinishes: ['Die-cut & punched holes', 'String & attachments', 'Foil & spot-UV detailing'],
    sizes: ['Any custom shape', 'Standard & mini tags', 'Bulk run quantities'],
    features: ['Custom die-cutting', 'Bulk pricing', 'Quick production'],
    badge: 'Custom',
  },
  {
    id: 'bill-books', label: 'Bill Books', basePrice: 1499, minQuantity: 500,
    slug: 'bill-books', category: 'Business & Billing',
    tagline: 'Billing made professional',
    description: 'Numbered bill books and invoice pads with carbon or NCR copies — the dependable daily billing tool for shops, clinics, and service businesses.',
    icon: 'Receipt',
    materials: ['NCR / carbonless paper sets', 'Quality cover stocks', 'Security number printing'],
    displayFinishes: ['Numbered & perforated', 'Brand covers', '2-3 part sets'],
    sizes: ['A5 & half-size bill books', 'Standard invoice pads', 'Custom formats'],
    features: ['Sequential numbering', 'Bulk stationery pricing', 'Quick turnaround'],
    badge: 'Daily Essential',
  },
  {
    id: 'digital-paper-printing', label: 'Digital Paper Printing', basePrice: 499, minQuantity: 500,
    slug: 'digital-paper-printing', category: 'Business & Billing',
    tagline: 'High-quality digital prints on demand',
    description: 'Quick, high-quality digital paper printing for documents, reports, presentations, and small marketing runs — from a few copies to larger batches.',
    icon: 'Printer',
    materials: ['Premium office & presentation papers', 'Coated & specialty stocks', 'Single & double-sided options'],
    displayFinishes: ['Full-color digital print', 'Binding & lamination available', 'Duplex printing'],
    sizes: ['A4, A3 & A5', 'Custom document formats'],
    features: ['Same-day turnaround on small runs', 'Binding & finishing services', 'Document quality guaranteed'],
    badge: 'On Demand',
  },
  {
    id: 'atm-pouches', label: 'ATM Pouches', basePrice: 1199, minQuantity: 500,
    slug: 'atm-pouches', category: 'Specialty Print',
    tagline: 'Trusted cash handling',
    description: 'Printed ATM pouches and cash-handling bags for banks and businesses — produced with secure, tamper-evident options on reliable materials.',
    icon: 'Briefcase',
    materials: ['Secure pouch-grade materials', 'Tear-resistant & sealed options', 'Bank-compliant stocks'],
    displayFinishes: ['Brand & bank printing', 'Tamper-evident sealing', 'Sequential numbering'],
    sizes: ['Standard ATM pouch sizes', 'Cash & document pouches', 'Custom bank formats'],
    features: ['Institutional pricing', 'Secure material options', 'Reliable bulk supply'],
    badge: 'Institutional',
  },
  {
    id: 'shooting-targets', label: 'Shooting Targets', basePrice: 999, minQuantity: 500,
    slug: 'shooting-targets', category: 'Specialty Print',
    tagline: 'Precise targets, consistent quality',
    description: 'Printed shooting targets for ranges, clubs, and training — produced on consistent stock with precise ring reproduction for dependable practice.',
    icon: 'Target',
    materials: ['Consistent target-grade paper', 'Card & rigid board options', 'Weather-resistant outdoor types'],
    displayFinishes: ['Precise ring & grid printing', 'Single & multi-target layouts', 'Custom club branding'],
    sizes: ['Standard target sheet sizes', 'A3, A4 & custom', 'Range & competition formats'],
    features: ['Consistent quality runs', 'Club & range bulk pricing', 'Custom layouts'],
    badge: 'Range Ready',
  },
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
  const product = PRINT_PRODUCTS.find((p) => p.id === input.product) ?? PRINT_PRODUCTS[0]!
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
