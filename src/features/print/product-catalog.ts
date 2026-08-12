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
  overview: string[]
  howItWorks: string[]
  faqs: { question: string; answer: string }[]
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
    id: 'visiting-cards', label: 'Visiting Cards', basePrice: 499, minQuantity: 1,
    slug: 'visiting-cards', category: 'Stationery & Cards',
    tagline: 'Your first impression, in print',
    description: 'Premium visiting cards crafted on quality stocks with premium finishes — from spot UV to gold foil — so your business feels established the moment your card is handed over.',
    icon: 'CreditCard',
    materials: ['Premium card stocks (350 GSM class)', 'Matte, gloss & textured surfaces', 'Metallic & linen-look finishes', 'PVC & specialty material options'],
    displayFinishes: ['Spot UV highlighting', 'Gold & silver foil stamping', 'Matte / gloss lamination', 'Embossing & debossing'],
    sizes: ['Standard card size', 'Slim & square formats', 'Custom sizes on request'],
    features: ['Free design check before print', '24-hour express on standard orders', 'Bulk pricing available'],
    overview: ['Your visiting card is usually the first physical thing a customer or prospect sees from your business. A premium, well-printed card signals that you are established, detail-oriented, and worth taking seriously.', 'We print on quality stocks with finishes like spot UV and gold foil, so your card looks and feels as professional as the business behind it.'],
    howItWorks: ['Share your logo and details, or work with our design review.', 'Choose your stock, size, and finish.', 'Approve a digital proof before we print.', 'Receive your cards, finished and ready to hand out.'],
    faqs: [{ question: 'How long do visiting cards take?', answer: 'Standard orders are printed within 24 hours, with express options available.' }, { question: 'Can I add foil or spot UV?', answer: 'Yes, gold and silver foil, spot UV, and embossing are available.' }, { question: 'What file format should I send?', answer: 'A print-ready PDF, or our design review will prepare it for you.' }, { question: 'Can I reorder easily?', answer: 'Yes, we keep your artwork on file for fast reorders.' }],
    badge: 'Most Popular',
  },
  {
    id: 'card-holders', label: 'Card Holders', basePrice: 799, minQuantity: 1,
    slug: 'card-holders', category: 'Stationery & Cards',
    tagline: 'Carry and present cards with class',
    description: 'Printed and branded card holders that keep visiting cards crisp, organized, and ready to present — ideal for sales teams, executives, and corporate gifting.',
    icon: 'Wallet',
    materials: ['Rigid board & premium papers', 'Leatherette & fabric options', 'PVC windowed and slip-on styles'],
    displayFinishes: ['Brand imprint on cover', 'Foil & emboss detailing', 'Lamination for durability'],
    sizes: ['Single & double card capacity', 'Wallet and desk styles', 'Custom branding sizes'],
    features: ['Bulk business gifting pricing', 'Custom logo printing', 'Quick turnaround'],
    overview: ['A branded card holder keeps your cards crisp and ready to present — and it quietly reinforces your brand every time it is handed over.', 'Ideal for sales teams, executives, and corporate gifting, our holders are printed and finished to match your identity.'],
    howItWorks: ['Choose your holder style and capacity.', 'Send your logo for the cover imprint.', 'Approve the layout and finish.', 'Receive finished holders ready for your team.'],
    faqs: [{ question: 'Which styles are available?', answer: 'Slip-on, wallet, and desk styles in single or double capacity.' }, { question: 'Can you brand the cover?', answer: 'Yes, with print, foil, or embossing.' }, { question: 'Is there bulk pricing?', answer: 'Yes, corporate gifting quantities get discounted pricing.' }, { question: 'Can I order a sample first?', answer: 'Yes, single samples are available.' }],
    badge: 'Corporate Favourite',
  },
  {
    id: 'pamphlets-posters', label: 'Pamphlets & Posters', basePrice: 1499, minQuantity: 1,
    slug: 'pamphlets-posters', category: 'Marketing & Labels',
    tagline: 'Marketing that gets noticed',
    description: 'Vibrant pamphlets, leaflets, and posters printed on quality paper stocks — built to be distributed, posted, and remembered.',
    icon: 'FileText',
    materials: ['Coated art paper & card', 'Matte / silk / gloss stocks', 'Recycled eco-friendly options'],
    displayFinishes: ['Full-color digital & offset print', 'Matte / gloss lamination', 'Folding & creasing'],
    sizes: ['A5, A4, A3 & custom', 'Tri-fold & bi-fold formats', 'Poster sizes on request'],
    features: ['Bulk distribution pricing', 'Print-ready file review included', 'Fast delivery'],
    overview: ['Pamphlets and posters are still one of the most cost-effective ways to get your message in front of local customers — whether distributed, posted, or handed out at events.', 'We print vibrant, durable marketing material on quality paper stocks, with folding and finishing options to match how you plan to distribute them.'],
    howItWorks: ['Share your artwork or brief for a design check.', 'Choose size, stock, and fold.', 'Approve the proof.', 'Receive your printed pamphlets or posters, ready to distribute.'],
    faqs: [{ question: 'What sizes do you offer?', answer: 'A5, A4, A3, and custom, with bi-fold and tri-fold options.' }, { question: 'Do you design the artwork?', answer: 'We review and can prepare print-ready files for you.' }, { question: 'Can I get matte or gloss finish?', answer: 'Yes, both laminations are available.' }, { question: 'What is the minimum order?', answer: 'Bulk pricing works best from a few hundred units up.' }],
    badge: 'High Volume',
  },
  {
    id: 'stickers-labels', label: 'Stickers & Labels', basePrice: 799, minQuantity: 1,
    slug: 'stickers-labels', category: 'Marketing & Labels',
    tagline: 'Brand every surface',
    description: 'Custom stickers and labels for products, packaging, promotions, and events — die-cut to any shape and finished to withstand daily handling.',
    icon: 'Sparkles',
    materials: ['Vinyl & adhesive label stock', 'Glossy, matte & transparent films', 'Paper & waterproof options'],
    displayFinishes: ['Die-cut custom shapes', 'Lamination (matte / gloss)', 'Weatherproof & removable adhesives'],
    sizes: ['Any shape or size', 'Roll & sheet formats', 'Product, pouch & label sizes'],
    features: ['Custom die-cutting', 'Bulk label pricing', 'Indoor & outdoor options'],
    overview: ['Stickers and labels put your brand on products and packaging in a way that sticks — literally. Die-cut to any shape, they turn everyday surfaces into marketing.', 'We print on vinyl and adhesive stocks with weatherproof and removable options, so your labels last as long as you need them to.'],
    howItWorks: ['Share your design and the shape you need.', 'Choose material and finish.', 'Approve a die-cut proof.', 'Receive sheets or rolls ready to apply.'],
    faqs: [{ question: 'Can you die-cut custom shapes?', answer: 'Yes, any shape you can design.' }, { question: 'Are they waterproof?', answer: 'Vinyl and laminate options are weather-resistant.' }, { question: 'Rolls or sheets?', answer: 'Both formats are available.' }, { question: 'Do you do bulk label runs?', answer: 'Yes, with discounted bulk pricing.' }],
    badge: 'Custom Cut',
  },
  {
    id: 'pens', label: 'Pens', basePrice: 1999, minQuantity: 1,
    slug: 'pens', category: 'Marketing & Labels',
    tagline: 'Giveaways that keep your name in hand',
    description: 'Branded promotional pens with your logo and message printed or engraved — the classic corporate giveaway that keeps working long after the meeting.',
    icon: 'PenTool',
    materials: ['Plastic & metal pen bodies', 'Gel, ballpoint & fountain options', 'Eco-friendly material choices'],
    displayFinishes: ['Logo printing (1-4 colors)', 'Engraving on metal', 'Custom color bodies'],
    sizes: ['Standard & slim profiles', 'Gift-boxed options', 'Bulk event quantities'],
    features: ['Bulk giveaway pricing', 'Corporate & event branding', 'Fast production'],
    overview: ['A branded pen is one of the most effective corporate giveaways — it is useful, kept, and carried, putting your name in front of customers long after the event.', 'We print or engrave your logo on quality pen bodies, with options to suit every budget and occasion.'],
    howItWorks: ['Choose your pen style and body.', 'Send your logo and preferred imprint.', 'Approve the mockup.', 'Receive finished pens, ready to give away.'],
    faqs: [{ question: 'Printing or engraving?', answer: 'Both are available, depending on the pen body.' }, { question: 'What quantities do you do?', answer: 'Bulk event quantities with tiered pricing.' }, { question: 'Can I see a sample?', answer: 'Yes, samples can be arranged.' }, { question: 'How fast is production?', answer: 'Standard production is quick, with express options.' }],
    badge: 'Promo Classic',
  },
  {
    id: 'sample-files', label: 'Sample Files', basePrice: 1499, minQuantity: 1,
    slug: 'sample-files', category: 'Marketing & Labels',
    tagline: 'Show your range in one place',
    description: 'Printed sample files that showcase your product range, materials, and finishes — the essential sales tool for dealers, distributors, and export teams.',
    icon: 'Copy',
    materials: ['Premium cover stocks', 'Assorted material swatches', 'Ring-bound & stitched options'],
    displayFinishes: ['Custom covers & branding', 'Laminated & foil detailing', 'Pocket & tab layouts'],
    sizes: ['A4 & custom formats', 'Multi-swatch inserts', 'Bound & loose-leaf styles'],
    features: ['Custom swatch selection', 'Business gifting ready', 'Short runs available'],
    overview: ['A sample file lets customers touch and compare your products in one place — the essential tool for dealers, distributors, and export teams.', 'We bind your material and finish swatches into a professional, branded presentation that sells your range for you.'],
    howItWorks: ['Select the materials and finishes to showcase.', 'We design a branded cover and layout.', 'Approve the layout.', 'Receive bound sample files ready for your team.'],
    faqs: [{ question: 'What can I include?', answer: 'Material swatches, finish samples, and your branding.' }, { question: 'How are they bound?', answer: 'Ring-bound or stitched, with pocket and tab options.' }, { question: 'Can I order a short run?', answer: 'Yes, short runs are available.' }, { question: 'Are they custom branded?', answer: 'Yes, covers and tabs can carry your logo.' }],
    badge: 'Sales Tool',
  },
  {
    id: 'letter-heads', label: 'Letter Heads', basePrice: 899, minQuantity: 1,
    slug: 'letter-heads', category: 'Business & Billing',
    tagline: 'Professional correspondence, branded to match your company image',
    description: 'Branded letterheads on premium writing paper that make every official correspondence look considered and professional.',
    icon: 'Mail',
    materials: ['Premium writing paper', 'Watermarked & security stocks', 'Cotton & textured options'],
    displayFinishes: ['Full-color brand printing', 'Embossed & foil branding', 'Standard A4 cut sizes'],
    sizes: ['A4 standard', 'Custom dimensions'],
    features: ['Matches your full brand kit', 'Bulk business pricing', 'Fast reordering'],
    overview: ['Official correspondence deserves better than a plain sheet. A branded letterhead makes every letter, quote, and notice look considered and professional.', 'We print on premium writing paper with options like embossing and foil, so your stationery matches the quality of your business.'],
    howItWorks: ['Send your logo and contact block.', 'Choose your paper stock.', 'Approve the proof.', 'Receive printed letterheads, ready for the office.'],
    faqs: [{ question: 'What paper do you use?', answer: 'Premium writing paper, with cotton and textured options.' }, { question: 'Can you match my brand colours?', answer: 'Yes, full-colour brand printing.' }, { question: 'What size?', answer: 'Standard A4, with custom sizes available.' }, { question: 'Do you offer bulk pricing?', answer: 'Yes, for reordering office stationery.' }],
    badge: 'Business Essential',
  },
  {
    id: 'envelopes', label: 'Envelopes', basePrice: 899, minQuantity: 1,
    slug: 'envelopes', category: 'Business & Billing',
    tagline: 'Brand the first thing they touch',
    description: 'Branded envelopes in every size — from daily correspondence to premium invitations — printed with your logo and finished for a premium first touch.',
    icon: 'MailOpen',
    materials: ['Kraft & white stocks', 'Premium & security papers', 'Windowed & padded options'],
    displayFinishes: ['Logo & return-address printing', 'Foil & laminated detailing', 'Custom flap styles'],
    sizes: ['DL, A4 & A5 envelopes', 'Document & courier sizes', 'Invitation & gifting formats'],
    features: ['Matches letterheads', 'Bulk office pricing', 'Quick turnaround'],
    overview: ['The envelope is the first thing your customer touches. A branded envelope turns routine mail into a polished first impression.', 'We print envelopes in every size with your logo and return address, in stocks that suit daily mail or premium invitations.'],
    howItWorks: ['Choose your envelope size and style.', 'Send your logo and return address.', 'Approve the layout.', 'Receive branded envelopes ready to send.'],
    faqs: [{ question: 'Which sizes?', answer: 'DL, A4, A5, and courier sizes.' }, { question: 'Windowed or plain?', answer: 'Both are available.' }, { question: 'Can they match my letterheads?', answer: 'Yes, we print matching sets.' }, { question: 'What stocks?', answer: 'Kraft, white, and premium papers.' }],
    badge: 'Business Essential',
  },
  {
    id: 'files', label: 'Files', basePrice: 999, minQuantity: 1,
    slug: 'files', category: 'Business & Billing',
    tagline: 'Organized offices, branded files',
    description: 'Printed office files and folders with your branding — built to organize documents and reinforce your identity in every office and client meeting.',
    icon: 'FolderOpen',
    materials: ['Rigid board & laminated covers', 'Premium paper & pouch folders', 'Expanding & clip styles'],
    displayFinishes: ['Full brand printing', 'Foil & emboss detailing', 'Pocket & gusset options'],
    sizes: ['A4 & legal sizes', 'Standard & expanding files', 'Custom corporate formats'],
    features: ['Bulk office supply pricing', 'Custom branding', 'Corporate kit options'],
    overview: ['Branded files and folders keep documents organized while reinforcing your identity in every meeting and handoff.', 'From simple printed folders to expanding files with pockets, we produce office stationery that works as hard as your team.'],
    howItWorks: ['Choose your file style and size.', 'Send your branding.', 'Approve the proof.', 'Receive printed files for the office.'],
    faqs: [{ question: 'What styles are available?', answer: 'Pouch folders, expanding files, and clip styles.' }, { question: 'Can you add pockets?', answer: 'Yes, pocket and gusset options.' }, { question: 'Sizes?', answer: 'A4 and legal, plus custom.' }, { question: 'Bulk pricing?', answer: 'Yes, office supply quantities.' }],
    badge: 'Office Ready',
  },
  {
    id: 'tags', label: 'Tags', basePrice: 599, minQuantity: 1,
    slug: 'tags', category: 'Business & Billing',
    tagline: 'Labels, price tags & more',
    description: 'Printed tags for products, pricing, luggage, and events — die-cut, punched, and finished exactly to your specification.',
    icon: 'Tag',
    materials: ['Card & specialty tag stock', 'Rigid & laminated options', 'Plastic & tear-resistant types'],
    displayFinishes: ['Die-cut & punched holes', 'String & attachments', 'Foil & spot-UV detailing'],
    sizes: ['Any custom shape', 'Standard & mini tags', 'Bulk run quantities'],
    features: ['Custom die-cutting', 'Bulk pricing', 'Quick production'],
    overview: ['Tags label your products, price your stock, and identify your luggage — small pieces that keep your brand visible everywhere.', 'Die-cut and punched to your specification, our tags come in card, rigid, and tear-resistant materials with finishing to match.'],
    howItWorks: ['Share your design and shape.', 'Choose material and finishing.', 'Approve the proof.', 'Receive tags with string or attachments ready.'],
    faqs: [{ question: 'Can I get any shape?', answer: 'Yes, custom die-cutting.' }, { question: 'Do you add strings?', answer: 'Yes, string and attachment options.' }, { question: 'Materials?', answer: 'Card, rigid, and tear-resistant stocks.' }, { question: 'Bulk pricing?', answer: 'Yes, for large runs.' }],
    badge: 'Custom',
  },
  {
    id: 'bill-books', label: 'Bill Books', basePrice: 1499, minQuantity: 1,
    slug: 'bill-books', category: 'Business & Billing',
    tagline: 'Billing made professional',
    description: 'Numbered bill books and invoice pads with carbon or NCR copies — the dependable daily billing tool for shops, clinics, and service businesses.',
    icon: 'Receipt',
    materials: ['NCR / carbonless paper sets', 'Quality cover stocks', 'Security number printing'],
    displayFinishes: ['Numbered & perforated', 'Brand covers', '2-3 part sets'],
    sizes: ['A5 & half-size bill books', 'Standard invoice pads', 'Custom formats'],
    features: ['Sequential numbering', 'Bulk stationery pricing', 'Quick turnaround'],
    overview: ['Bill books and invoice pads are the daily backbone of shops, clinics, and service businesses. Dependable, numbered, and branded, they keep your billing clean and professional.', 'We print carbonless NCR sets with security numbering and branded covers, so every transaction leaves a clear, legible record.'],
    howItWorks: ['Choose your format and number of parts.', 'Send your branding and layout.', 'Approve the proof.', 'Receive numbered bill books ready for daily use.'],
    faqs: [{ question: '2-part or 3-part?', answer: 'Both are available.' }, { question: 'Are they numbered?', answer: 'Yes, sequential numbering is standard.' }, { question: 'What sizes?', answer: 'A5 and half-size bill books, plus custom.' }, { question: 'Do they use NCR paper?', answer: 'Yes, carbonless copies.' }],
    badge: 'Daily Essential',
  },
  {
    id: 'digital-paper-printing', label: 'Digital Paper Printing', basePrice: 499, minQuantity: 1,
    slug: 'digital-paper-printing', category: 'Business & Billing',
    tagline: 'High-quality digital prints on demand',
    description: 'Quick, high-quality digital paper printing for documents, reports, presentations, and small marketing runs — from a few copies to larger batches.',
    icon: 'Printer',
    materials: ['Premium office & presentation papers', 'Coated & specialty stocks', 'Single & double-sided options'],
    displayFinishes: ['Full-color digital print', 'Binding & lamination available', 'Duplex printing'],
    sizes: ['A4, A3 & A5', 'Custom document formats'],
    features: ['Same-day turnaround on small runs', 'Binding & finishing services', 'Document quality guaranteed'],
    overview: ['When you need documents, reports, or small marketing runs printed quickly and cleanly, digital printing delivers on demand — from a few copies to larger batches.', 'We print on premium papers with binding and lamination options, so your documents look sharp whether they are for a client or a boardroom.'],
    howItWorks: ['Upload your document or brief.', 'Choose paper, size, and finishing.', 'Approve the run.', 'Collect or receive your prints, often same-day.'],
    faqs: [{ question: 'How fast?', answer: 'Small runs are often same-day.' }, { question: 'What finishing?', answer: 'Binding, lamination, and duplex printing.' }, { question: 'Sizes?', answer: 'A4, A3, and A5.' }, { question: 'Small quantities?', answer: 'Yes, from a few copies up.' }],
    badge: 'On Demand',
  },
  {
    id: 'atm-pouches', label: 'ATM Pouches', basePrice: 1199, minQuantity: 1,
    slug: 'atm-pouches', category: 'Specialty Print',
    tagline: 'Trusted cash handling',
    description: 'Printed ATM pouches and cash-handling bags for banks and businesses — produced with secure, tamper-evident options on reliable materials.',
    icon: 'Briefcase',
    materials: ['Secure pouch-grade materials', 'Tear-resistant & sealed options', 'Bank-compliant stocks'],
    displayFinishes: ['Brand & bank printing', 'Tamper-evident sealing', 'Sequential numbering'],
    sizes: ['Standard ATM pouch sizes', 'Cash & document pouches', 'Custom bank formats'],
    features: ['Institutional pricing', 'Secure material options', 'Reliable bulk supply'],
    overview: ['Cash handling demands reliability. Our ATM pouches are produced on secure, tear-resistant materials with tamper-evident options that banks and businesses trust.', 'We print and number pouches to institutional standards, delivering consistent, dependable supply for high-volume use.'],
    howItWorks: ['Confirm your pouch size and compliance needs.', 'Send branding and numbering requirements.', 'Approve the proof.', 'Receive secure pouches on your supply schedule.'],
    faqs: [{ question: 'Are they tamper-evident?', answer: 'Yes, tamper-evident sealing is available.' }, { question: 'Are they numbered?', answer: 'Yes, sequential numbering.' }, { question: 'Do you supply banks?', answer: 'Yes, institutional supply at scale.' }, { question: 'Custom sizes?', answer: 'Yes, standard and custom formats.' }],
    badge: 'Institutional',
  },
  {
    id: 'shooting-targets', label: 'Shooting Targets', basePrice: 999, minQuantity: 1,
    slug: 'shooting-targets', category: 'Specialty Print',
    tagline: 'Precise targets, consistent quality',
    description: 'Printed shooting targets for ranges, clubs, and training — produced on consistent stock with precise ring reproduction for dependable practice.',
    icon: 'Target',
    materials: ['Consistent target-grade paper', 'Card & rigid board options', 'Weather-resistant outdoor types'],
    displayFinishes: ['Precise ring & grid printing', 'Single & multi-target layouts', 'Custom club branding'],
    sizes: ['Standard target sheet sizes', 'A3, A4 & custom', 'Range & competition formats'],
    features: ['Consistent quality runs', 'Club & range bulk pricing', 'Custom layouts'],
    overview: ['For ranges, clubs, and training programs, consistent target quality matters. Our targets are printed with precise ring and grid reproduction on dependable stock.', 'We produce single and multi-target layouts with custom club branding, in weather-resistant options for outdoor use.'],
    howItWorks: ['Choose your target layout.', 'Send club branding if needed.', 'Approve the design.', 'Receive targets in consistent runs.'],
    faqs: [{ question: 'What sizes?', answer: 'Standard sheet sizes, A3, A4, and custom.' }, { question: 'Outdoor use?', answer: 'Weather-resistant options available.' }, { question: 'Custom layouts?', answer: 'Yes, single and multi-target designs.' }, { question: 'Club pricing?', answer: 'Yes, bulk range and club pricing.' }],
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

export function getProductLabel(productId: string): string {
  return PRINT_PRODUCTS.find((p) => p.id === productId)?.label ?? productId
}
