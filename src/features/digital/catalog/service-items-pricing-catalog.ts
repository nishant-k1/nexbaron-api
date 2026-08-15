// Service pricing catalog — the single source of truth for every service we
// sell and what it costs to deliver.
//
// Pricing model (per item):
//   selling = round((costPrice) × (1 + markupPct / 100))      [cost-based items]
//   selling = sellingPrice override                            [flat-price items]
//   total delivered cost = costPrice (vendor) + labourHours × hourlyCost
//   hourlyCost defaults to LABOUR_HOURLY_RATE (configurable blended cost).
//   Adding labourHours never changes the selling price — it only makes
//   cost/margin reporting truthful so underpriced services surface as negative
//   gross margin instead of a fake "100%".
//   Tiers per item: setup (one-time) · monthly · annual.
//   Annual invariant: every recurring item charges 10 months (2 months free) —
//   see computeItemSelling().
//
// Margin policy:
//   - Pure pass-through (domains, SSL, stock licences, SMS/API credits, AI
//     generation credits): 10% or less — we don't profit on commodities the
//     client can price-check.
//   - Managed recurring infra (hosting, backups, monitoring, SaaS tools we
//     operate for the client): 30–50%.
//   - Labour / delivery (design, development, content, marketing management):
//     50% or more — this pays for people and is where margin lives. Where the
//     policy is violated the aggregate now reports it faithfully.
//
// A Service bundles many items; its `aggregate` sums them. Plans
// (service-package-pricing-catalog.ts) pick services + add-ons, and
// enrichCatalog() totals each plan by summing the services' selling prices —
// cumulative tiers declare `inheritsFrom` explicitly (Growth inherits Launch,
// Scale inherits Growth); standalone plans price their own services only.
//
// To change pricing, edit the `items` below (costPrice + markupPct, or a
// flat sellingPrice) — the rest is computed, never hand-edited.

import { SERVICE_CONTENT } from './service-content'

export type ServiceStage = 'design' | 'build' | 'setup'

// Blended fully-loaded cost to employ across dev/design/content/marketing roles
// (salary + benefits + tools + overhead, per productive hour). Configurable —
// set to your real cost-to-employ; used to value `labourHours` on items.
export const LABOUR_HOURLY_RATE = 400 // INR per hour

export interface ServiceItem {
  label: string
  costPrice: { setup: number; monthly: number; annual: number } // INR — vendor/pass-through COGS (hosting, SMS, licences, stock)
  labourHours?: { setup?: number; monthly?: number; annual?: number } // our hours per tier, valued at hourlyCost
  hourlyCost?: number // override LABOUR_HOURLY_RATE for this item (e.g. senior dev vs junior ops)
  markupPct: { setup: number; monthly: number; annual: number } // markup percentage (40 = 40%)
  sellingPrice?: { setup?: number; monthly?: number; annual?: number } // optional INR override
}

export interface ServiceAggregate {
  // vendor = pure pass-through COGS (costPrice). labour = hours × hourly rate.
  // cost = vendor + labour — the TRUE delivered cost used for margin reporting.
  vendor: { setup: number; monthly: number; annual: number } // INR
  labour: { setup: number; monthly: number; annual: number } // INR
  cost: { setup: number; monthly: number; annual: number } // INR — vendor + labour
  selling: { setup: number; monthly: number; annual: number } // INR
  // TRUE gross margin ((sell−cost)/sell) per tier, or null when the tier has
  // selling price but NO modeled cost (fully flat/free items). The margin is
  // unknown there, not 100% — never display these as profitable.
  grossMarginPct: { setup: number | null; monthly: number | null; annual: number | null }
  // % of selling backed by modeled cost (vendor + labour). 0 = fully flat,
  // up to 100 = fully costed.
  costCoveredPct: { setup: number; monthly: number; annual: number }
}

export interface ServiceFaq {
  question: string
  answer: string
}

export interface Service {
  id: string
  label: string
  items: ServiceItem[]
  clientCostNote?: string
  aggregate?: ServiceAggregate
  unitLabel?: string
  deliverDays?: number
  parallel?: boolean
  stage?: ServiceStage
  icon?: string
  section?: string
}

export interface ServiceSection {
  id: string
  slug: string
  title: string
  subtitle: string
  icon: string
}

// Marketing grouping for the public "services offered" page. Prices are hidden
// there — the same catalog powers both the pricing page and the services page.
export const SERVICE_SECTIONS: ServiceSection[] = [
  { id: 'build', slug: 'web-design', title: 'Build', subtitle: 'Everything needed to establish your business online.', icon: 'Globe' },
  { id: 'get-found', slug: 'local-seo', title: 'Get Found', subtitle: 'Everything needed for customers to discover your business.', icon: 'Search' },
  { id: 'stay-active', slug: 'social-media', title: 'Stay Active', subtitle: 'Everything needed to keep your business visible.', icon: 'Share2' },
  { id: 'grow', slug: 'online-ads', title: 'Grow', subtitle: 'Everything needed to generate leads.', icon: 'TrendingUp' },
  { id: 'automate', slug: 'automation', title: 'Automate', subtitle: 'Everything that saves time.', icon: 'Wand2' },
  { id: 'care', slug: 'website-care', title: 'Care', subtitle: 'Everything that keeps things running.', icon: 'Shield' },
  { id: 'custom-software', slug: 'custom-software', title: 'Custom Software', subtitle: 'Bespoke dashboards, CRMs, and internal tools built around your workflow.', icon: 'Code' },
]

export interface PlanPricing {
  setup: number
  monthly: number
  annual: number
  ownSetup: number
  ownMonthly: number
  ownAnnual: number
}

export interface Plan {
  id: string
  name: string
  tagline: string
  timeline: string
  icon: string
  featured?: boolean
  inherited?: { label: string }
  inheritsFrom?: string
  services: Service[]
  addOns: Service[]
  ctaLabel: string
  timelineMode?: 'phased'
  foundationDays?: number
  expectations?: { label: string; note: string }[]
  minimumMonths?: number
  pricing?: PlanPricing
}

export interface PlanCatalog {
  version: string
  updatedAt: string
  currency: 'INR'
  disclaimer?: string
  sharedInfra: { category: string; label: string; monthlyCost: number; upgradePath?: string; upgradeCost?: number; commercialOnly?: boolean; agencyOperated?: string }[]
  plans: Plan[]
}

// ---------------------------------------------------------------------------
// Compute helpers
// ---------------------------------------------------------------------------

function selling(cost: number, markupPct: number): number {
  return Math.round(cost * (1 + markupPct / 100))
}

export function computeItemSelling(item: ServiceItem) {
  const setup = item.sellingPrice?.setup ?? selling(item.costPrice.setup, item.markupPct.setup)
  const monthly = item.sellingPrice?.monthly ?? selling(item.costPrice.monthly, item.markupPct.monthly)
  // Annual invariant: recurring items charge 10 months (2 months free). An
  // explicit annual tier (real annual infra rate) wins; otherwise labour items
  // default to 10x their monthly price so annual plans never give the work away.
  const explicitAnnual = item.sellingPrice?.annual && item.sellingPrice.annual > 0 ? item.sellingPrice.annual : 0
  const annual =
    explicitAnnual > 0
      ? explicitAnnual
      : item.costPrice.annual > 0
        ? selling(item.costPrice.annual, item.markupPct.annual)
        : monthly > 0
          ? Math.round(monthly * 10)
          : 0
  return { setup, monthly, annual }
}

export function computeServiceAggregate(svc: Service): ServiceAggregate {
  let vendorSetup = 0
  let vendorMonthly = 0
  let vendorAnnual = 0
  let labourSetup = 0
  let labourMonthly = 0
  let labourAnnual = 0
  let sellSetup = 0
  let sellMonthly = 0
  let sellAnnual = 0

  for (const item of svc.items) {
    const sell = computeItemSelling(item)
    const rate = item.hourlyCost ?? LABOUR_HOURLY_RATE
    vendorSetup += item.costPrice.setup
    vendorMonthly += item.costPrice.monthly
    vendorAnnual += item.costPrice.annual
    labourSetup += (item.labourHours?.setup ?? 0) * rate
    labourMonthly += (item.labourHours?.monthly ?? 0) * rate
    labourAnnual += (item.labourHours?.annual ?? 0) * rate
    sellSetup += sell.setup
    sellMonthly += sell.monthly
    sellAnnual += sell.annual
  }

  const costSetup = vendorSetup + labourSetup
  const costMonthly = vendorMonthly + labourMonthly
  const costAnnual = vendorAnnual + labourAnnual

  const margin = (cost: number, sell: number): number | null => {
    if (cost > 0 && sell > 0) return Math.round((sell - cost) / sell * 100)
    return null
  }
  const coverage = (cost: number, sell: number): number => {
    if (sell <= 0) return 0
    return Math.min(100, Math.round(cost / sell * 100))
  }

  return {
    vendor: { setup: vendorSetup, monthly: vendorMonthly, annual: vendorAnnual },
    labour: { setup: labourSetup, monthly: labourMonthly, annual: labourAnnual },
    cost: { setup: costSetup, monthly: costMonthly, annual: costAnnual },
    selling: { setup: sellSetup, monthly: sellMonthly, annual: sellAnnual },
    // Real gross margin = profit / selling price. Null when a tier carries a
    // selling price but no modeled cost (flat-price items) — the margin is not
    // 100%, it's simply unknown because no COGS is modeled.
    grossMarginPct: {
      setup: margin(costSetup, sellSetup),
      monthly: margin(costMonthly, sellMonthly),
      annual: margin(costAnnual, sellAnnual),
    },
    costCoveredPct: {
      setup: coverage(costSetup, sellSetup),
      monthly: coverage(costMonthly, sellMonthly),
      annual: coverage(costAnnual, sellAnnual),
    },
  }
}

export function enrichCatalog(catalog: PlanCatalog): PlanCatalog {
  const cumById: Record<string, { setup: number; monthly: number; annual: number }> = {}

  for (const plan of catalog.plans) {
    if (plan.id === 'custom') continue

    // Validate inheritance wiring: inherited plans must declare inheritsFrom,
    // and if they do, the referenced base must have been processed already.
    const baseId = plan.inheritsFrom

    for (const svc of [...plan.services, ...plan.addOns]) {
      svc.aggregate = computeServiceAggregate(svc)
    }

    // Base package price = services only (add-ons are optional extras chosen at checkout).
    const ownSetup = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.setup ?? 0), 0)
    const ownMonthly = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.monthly ?? 0), 0)
    const ownAnnual = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.annual ?? 0), 0)

    if (plan.inherited) {
      if (!baseId) throw new Error(`Plan "${plan.id}" is inherited but has no inheritsFrom`)
      const base = cumById[baseId]
      if (!base) throw new Error(`Plan "${plan.id}" inherits from "${baseId}" but that plan was not resolved`)
      const setup = base.setup + ownSetup
      const monthly = base.monthly + ownMonthly
      const annual = base.annual + ownAnnual
      plan.pricing = { setup, monthly, annual, ownSetup, ownMonthly, ownAnnual }
      cumById[plan.id] = { setup, monthly, annual }
    } else {
      // Standalone tier (e.g. Launch, AI Growth): prices its own services only —
      // it still registers its totals so a later `inheritsFrom` plan builds on it.
      plan.pricing = { setup: ownSetup, monthly: ownMonthly, annual: ownAnnual, ownSetup, ownMonthly, ownAnnual }
      cumById[plan.id] = { setup: ownSetup, monthly: ownMonthly, annual: ownAnnual }
    }
  }
  return catalog
}

// ---------------------------------------------------------------------------
// Service item builders — use these to define `items` in SERVICES below.
//
// Cost model:  selling = round(cost × (1 + markupPct/100))
//              (a `sellingPrice` override — flat-price items — wins instead)
//
//   oneTimeItem('Domain', 800, 30)      → ₹800 one-time cost + 30%  = ₹1,040
//   monthlyItem('Hosting', 300, 50)     → ₹300/mo cost + 50%        = ₹450/mo
//   flatWithLabour('Setup', {setup:2000},{setup:10})
//                                      → flat ₹2,000 sale, labor 10h → cost 4,000
//                                        (sale unchanged; margin reports underpricing)
// ---------------------------------------------------------------------------

function buildItem(
  label: string,
  costSetup: number,
  costMonthly: number,
  costAnnual: number,
  markupPctSetup: number,
  markupPctMonthly: number,
  markupPctAnnual: number,
  sellSetup?: number,
  sellMonthly?: number,
  sellAnnual?: number,
): ServiceItem {
  const result: ServiceItem = {
    label,
    costPrice: { setup: costSetup, monthly: costMonthly, annual: costAnnual },
    markupPct: { setup: markupPctSetup, monthly: markupPctMonthly, annual: markupPctAnnual },
  }
  if (sellSetup !== undefined || sellMonthly !== undefined || sellAnnual !== undefined) {
    result.sellingPrice = { setup: sellSetup ?? 0, monthly: sellMonthly ?? 0, annual: sellAnnual ?? 0 }
  }
  return result
}

// One-time deliverable: cost + markup %. Selling = cost × (1 + markupPct/100).
export function oneTimeItem(label: string, cost: number, markupPct: number): ServiceItem {
  return buildItem(label, cost, 0, 0, markupPct, 0, 0)
}

// Monthly recurring: cost + markup %. Pass annualCost to also price the annual tier.
export function monthlyItem(label: string, cost: number, markupPct: number, annualCost = 0): ServiceItem {
  return buildItem(label, 0, cost, annualCost, 0, markupPct, annualCost > 0 ? markupPct : 0)
}

// One-time setup + annual renewal (domains, licences the client owns): inflated
// by markup on both tiers. Renewal is a real recurring cost, so price it.
export function annualItem(label: string, setupCost: number, renewalCost: number, markupPct: number): ServiceItem {
  return buildItem(label, setupCost, 0, renewalCost, markupPct, 0, markupPct)
}

// Flat selling price value + labour hours to estimate real cost. Selling stays
// flat — labour hours only feed cost/margin reporting, so adding the hours never
// changes what the client pays. `hours` keys match the tiers being sold.
export function flatWithLabour(
  label: string,
  sell: { setup?: number; monthly?: number; annual?: number },
  hours: { setup?: number; monthly?: number; annual?: number },
): ServiceItem {
  const item = buildItem(
    label, 0, 0, 0, 0, 0, 0,
    sell.setup ?? 0,
    sell.monthly ?? 0,
    sell.annual ?? 0,
  )
  item.labourHours = hours
  return item
}

// ---------------------------------------------------------------------------
// Shared infrastructure
// ---------------------------------------------------------------------------

export const SHARED_INFRA: PlanCatalog['sharedInfra'] = [
  { category: 'Version Control', label: 'GitHub Free', monthlyCost: 0, upgradePath: 'GitHub Team', upgradeCost: 1750, agencyOperated: 'Client owns the repo; Nexbaron gets collaborator access' },
  { category: 'Deployment', label: 'Vercel Hobby', monthlyCost: 0, upgradePath: 'Vercel Pro', upgradeCost: 1700, commercialOnly: true, agencyOperated: 'Hobby is personal/non-commercial — client sites run on Vercel Pro in the client-owned project. Not priced at ₹0.' },
  { category: 'CDN & DNS', label: 'Cloudflare Free', monthlyCost: 0, upgradePath: 'Cloudflare Pro', upgradeCost: 1650 },
  { category: 'Email', label: 'Zoho Mail Lite (2 users)', monthlyCost: 100, upgradePath: 'Zoho Workplace', upgradeCost: 700 },
  { category: 'Design', label: 'Figma Free', monthlyCost: 0, upgradePath: 'Figma Professional', upgradeCost: 2000 },
  { category: 'Graphics', label: 'Canva Free', monthlyCost: 0, upgradePath: 'Canva Pro', upgradeCost: 500 },
  { category: 'Docs & Tasks', label: 'Notion Free', monthlyCost: 0, upgradePath: 'Notion Plus', upgradeCost: 500 },
  { category: 'Email API', label: 'Resend Free', monthlyCost: 0, upgradePath: 'Resend Team', upgradeCost: 1700 },
  { category: 'Client Chat', label: 'WhatsApp Business', monthlyCost: 0, upgradePath: 'WATI / Interakt', upgradeCost: 500 },
  { category: 'Email Marketing', label: 'Brevo Free', monthlyCost: 0, upgradePath: 'Brevo Starter', upgradeCost: 2100 },
  { category: 'SMS', label: 'Twilio PAYG (~500 msgs)', monthlyCost: 250, upgradePath: 'Textlocal Pro', upgradeCost: 1500 },
]

// ---------------------------------------------------------------------------
// ALL SERVICE DEFINITIONS — single source of truth
//
// Naming convention:
//   - service label is PUBLIC — what the client sees.
//     Always plain business language, never technical jargon.
//   - items are the technical breakdown underneath — real costs, tools, and
//     steps that keep the service running. Jargon is fine here; the client
//     only sees the friendly label on top.
//
// The combined SERVICES below is the single source of truth for plans and the
// public pricing/services pages. Never edit SERVICES directly — add/amend
// services in the dev/marketing file that owns them.
// ---------------------------------------------------------------------------

export const SERVICES: Service[] = [
  // --- Website & online presence ---

  {
    id: 'website',
    label: 'Website — Up to 5 Pages',
    icon: 'Globe',
    section: 'build',
    items: [
      annualItem('Domain Registration (setup + ₹800/yr renewal)', 800, 800, 10),
      oneTimeItem('Domain Privacy Protection', 200, 10),
      oneTimeItem('SSL Certificate', 300, 10),
      monthlyItem('Cloud Hosting', 300, 50, 3000),
      monthlyItem('S3 / Asset Storage', 80, 30, 800),
      flatWithLabour('CDN Setup (Cloudflare)', { setup: 2000 }, { setup: 2 }),
      flatWithLabour('DNS Configuration', { setup: 500 }, { setup: 1 }),
      flatWithLabour('Git Repository Setup', { setup: 300 }, { setup: 1 }),
      flatWithLabour('CI/CD Pipeline', { setup: 600 }, { setup: 3 }),
      flatWithLabour('Design — Figma mockups', { setup: 600 }, { setup: 6 }),
      flatWithLabour('Development — Next.js build', { setup: 1000 }, { setup: 20 }),
      flatWithLabour('Content writing (5 pgs)', { setup: 800 }, { setup: 10 }),
      oneTimeItem('Image sourcing (10 imgs)', 300, 50),
      flatWithLabour('Mobile responsive testing', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Cross-browser testing', { setup: 300 }, { setup: 2 }),
      flatWithLabour('SEO meta tags + sitemap', { setup: 400 }, { setup: 2 }),
      flatWithLabour('GA4 property setup', { setup: 0 }, { setup: 2 }),
      flatWithLabour('Google Search Console setup', { setup: 0 }, { setup: 1 }),
      flatWithLabour('Lighthouse perf optimization', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Security headers hardening', { setup: 400 }, { setup: 1 }),
      monthlyItem('Daily backups', 100, 30, 1000),
      flatWithLabour('Uptime monitoring', { monthly: 400 }, { monthly: 1 }),
      flatWithLabour('Privacy policy template', { setup: 200 }, { setup: 1 }),
    ],
    deliverDays: 1, stage: 'build',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Chat Button',
    icon: 'MessageSquare',
    section: 'build',
    items: [
      flatWithLabour('WhatsApp Business Account', { setup: 0 }, { setup: 1 }),
      flatWithLabour('Chat bubble + pre-chat name/phone form', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Click-to-chat deep link + offline message', { setup: 250 }, { setup: 1 }),
      monthlyItem('WA API conversation costs', 50, 40, 500),
      flatWithLabour('Chat click tracking + analytics', { setup: 100 }, { setup: 1 }),
      flatWithLabour('Mobile + desktop testing', { setup: 150 }, { setup: 1 }),
    ],
    deliverDays: 0, stage: 'build',
  },
  {
    id: 'gbp',
    label: 'Google Business Profile — Setup & Verify',
    icon: 'MapPin',
    section: 'build',
    items: [
      flatWithLabour('Business verification assistance (method auto-selected by Google)', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Business info + hours setup', { setup: 250 }, { setup: 1.5 }),
      flatWithLabour('Category + service area setup', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Photo upload + optimization', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Q&A section pre-population', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Review response templates', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Product/menu section setup', { setup: 300 }, { setup: 2 }),
    ],
    deliverDays: 0.5, parallel: true, stage: 'setup',
  },
  {
    id: 'analytics',
    label: 'Visit Analytics',
    icon: 'BarChart3',
    section: 'build',
    items: [
      flatWithLabour('GA4 property + data stream', { setup: 0 }, { setup: 1.5 }),
      flatWithLabour('GTM container + triggers', { setup: 0 }, { setup: 1.5 }),
      flatWithLabour('Event tracking setup', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Conversion goal setup', { setup: 250 }, { setup: 1.5 }),
      flatWithLabour('Custom Looker Studio dashboard', { setup: 400 }, { setup: 3 }),
      flatWithLabour('Search Console + sitemap', { setup: 0 }, { setup: 1 }),
      flatWithLabour('UTM parameter standardization', { setup: 200 }, { setup: 1 }),
    ],
    deliverDays: 0.5, parallel: true, stage: 'setup',
  },
  // --- Website add-ons ---

  {
    id: 'launch-pages',
    label: 'Extra pages',
    icon: 'FileText',
    section: 'build',
    items: [
      flatWithLabour('Content writing (500 words)', { setup: 200 }, { setup: 1.5 }),
      flatWithLabour('Design layout in Figma', { setup: 150 }, { setup: 1.5 }),
      flatWithLabour('Development + responsive QA', { setup: 150 }, { setup: 2 }),
      oneTimeItem('Image sourcing (2 images)', 50, 50),
      flatWithLabour('SEO meta tags for page', { setup: 100 }, { setup: 0.5 }),
    ],
    unitLabel: 'per page', deliverDays: 0.25, stage: 'build',
  },
  {
    id: 'launch-photos',
    label: 'Additional photos',
    icon: 'Image',
    section: 'build',
    items: [
      oneTimeItem('Stock photo license', 80, 10),
      flatWithLabour('Image optimization (WebP/AVIF)', { setup: 200 }, { setup: 1.5 }),
      flatWithLabour('Alt text + SEO metadata', { setup: 100 }, { setup: 1 }),
    ],
    deliverDays: 0.25, stage: 'build',
  },
  {
    id: 'launch-domain',
    label: 'Domain setup',
    icon: 'Link',
    section: 'build',
    items: [
      flatWithLabour('DNS record configuration', { setup: 300 }, { setup: 1 }),
      flatWithLabour('Email forwarding setup', { setup: 0 }, { setup: 0.5 }),
      flatWithLabour('Subdomain configuration', { setup: 200 }, { setup: 1 }),
      flatWithLabour('SSL auto-renewal verification', { setup: 200 }, { setup: 0.5 }),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  // --- SEO & local ranking ---

  {
    id: 'gbp-optimise',
    label: 'Google Business Profile — Optimize & Get Found',
    icon: 'MapPin',
    section: 'get-found',
    items: [
      flatWithLabour('Weekly GBP posts (4/mo) — offers, updates, photos', { monthly: 800 }, { monthly: 6 }),
      flatWithLabour('Photo optimization + categorization', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Offer / promotion post design (Canva)', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Review generation campaign + reply drafting', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('Q&A section monitoring + replies', { monthly: 200 }, { monthly: 1 }),
      flatWithLabour('Competitor GBP analysis (top 3)', { monthly: 300 }, { monthly: 2 }),
      monthlyItem('Google Maps ranking tracker', 200, 40, 2000),
      monthlyItem('Local Falcon rank checker', 150, 30, 1500),
      flatWithLabour('Monthly performance report', { monthly: 300 }, { monthly: 1.5 }),
    ],
    deliverDays: 0.5, stage: 'setup',
  },
  {
    id: 'local-seo',
    label: 'Local SEO — Google Maps Optimization',
    icon: 'Search',
    section: 'get-found',
    items: [
      flatWithLabour('Local keyword research (30 kw)', { monthly: 600 }, { monthly: 4 }),
      flatWithLabour('Citation building (20+ dirs)', { monthly: 500 }, { monthly: 4 }),
      flatWithLabour('NAP consistency audit', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Local backlink outreach (5/mo)', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Location page schema markup', { monthly: 250 }, { monthly: 1 }),
      monthlyItem('BrightLocal / Whitespark tool', 300, 30, 3000),
      flatWithLabour('Monthly ranking report', { monthly: 300 }, { monthly: 1.5 }),
    ],
    stage: 'setup',
  },
  {
    id: 'whatsapp-book',
    label: 'WhatsApp Business — Auto-reply & Booking',
    icon: 'MessageSquare',
    section: 'automate',
    items: [
      monthlyItem('WATI / Interakt platform', 500, 40, 5000),
      flatWithLabour('Auto-reply greeting flow', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Quick replies menu (5 options)', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Away message automation', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Labels + chat organization', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Catalog setup in WhatsApp', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Booking flow setup', { setup: 400 }, { setup: 2.5 }),
      monthlyItem('API conversation costs', 300, 30, 3000),
    ],
    deliverDays: 0.5, stage: 'setup',
  },
  {
    id: 'reviews',
    label: 'Review Generation & Management',
    icon: 'Star',
    section: 'get-found',
    items: [
      flatWithLabour('Review link generator + Google redirect', { setup: 0 }, { setup: 0.5 }),
      monthlyItem('SMS review requests (Twilio)', 150, 10, 1500),
      flatWithLabour('WhatsApp + email review request automation', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Review monitoring (alerts)', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('Review showcase on website', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Feedback collection + issue escalation', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Monthly review performance dashboard', { monthly: 200 }, { monthly: 1 }),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  {
    id: 'social',
    label: 'Social Media — 8 Posts/month',
    icon: 'Share2',
    section: 'stay-active',
    items: [
      flatWithLabour('Content calendar planning', { monthly: 300, annual: 3000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Copywriting (8 posts)', { monthly: 400, annual: 4000 }, { monthly: 4, annual: 40 }),
      flatWithLabour('Graphic design (8 creatives)', { monthly: 600, annual: 6000 }, { monthly: 6, annual: 60 }),
      monthlyItem('Stock imagery (4 imgs/mo)', 200, 10, 2000),
      flatWithLabour('Hashtag research', { monthly: 200, annual: 2000 }, { monthly: 1, annual: 10 }),
      flatWithLabour('Engagement monitoring + replies', { monthly: 200, annual: 2000 }, { monthly: 3, annual: 30 }),
      flatWithLabour('Monthly social report', { monthly: 300, annual: 3000 }, { monthly: 2, annual: 20 }),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  {
    id: 'seo-report',
    label: 'Monthly SEO Health Report',
    icon: 'BarChart3',
    section: 'get-found',
    items: [
      flatWithLabour('Google Search Console data pull', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('Keyword position tracking', { monthly: 200 }, { monthly: 1 }),
      monthlyItem('Technical SEO crawl (Sitebulb)', 200, 30, 2000),
      flatWithLabour('Page speed analysis (Lighthouse)', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('Broken link check', { monthly: 100 }, { monthly: 0.5 }),
      flatWithLabour('Competitor comparison (top 3)', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Actionable recommendations', { monthly: 200 }, { monthly: 1.5 }),
      flatWithLabour('PDF report generation (branded)', { monthly: 200 }, { monthly: 1 }),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  // --- Advertising — setup ---

  {
    id: 'google-ads-setup',
    label: 'Google Ads Setup — Search, Maps & Video',
    icon: 'Search',
    section: 'grow',
    items: [
      flatWithLabour('Google Ads account + conversion tracking', { setup: 0 }, { setup: 2 }),
      flatWithLabour('Search Ads — keyword research + text ad copy', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Maps / Local Services Ads — listing + geo-setup', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Performance Max — image assets + headlines', { setup: 500 }, { setup: 3 }),
      flatWithLabour('YouTube Ads — bumper + discovery ad setup', { setup: 400 }, { setup: 2.5 }),
      flatWithLabour('Landing page optimization for ads', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Ad extensions — call, location, sitelink', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Budget strategy + bid management setup', { setup: 300 }, { setup: 2 }),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹2K–10K/mo recommended)',
  },
  {
    id: 'meta-ads-setup',
    label: 'Meta Ads Setup — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      flatWithLabour('Meta Business Suite + Commerce Manager setup', { setup: 0 }, { setup: 2 }),
      flatWithLabour('FB Pixel + CAPI event setup (shared)', { setup: 0 }, { setup: 3 }),
      flatWithLabour('Facebook Feed + Stories — image ads + copy', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Instagram Feed + Stories + Reels — vertical ads', { setup: 600 }, { setup: 4 }),
      monthlyItem('WhatsApp — WATI/Interakt platform subscription', 500, 40, 5000),
      flatWithLabour('WhatsApp — Business API message templates', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Messenger — click-to-Messenger flow setup', { setup: 0 }, { setup: 1.5 }),
      flatWithLabour('Audience research — custom + lookalike', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Campaign structure — prospecting + retargeting', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Budget strategy + bid setup', { setup: 300 }, { setup: 2 }),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Meta (~₹3K–15K/mo recommended)',
  },
  {
    id: 'growth-city',
    label: 'Cover another city',
    icon: 'MapPin',
    section: 'grow',
    items: [
      flatWithLabour('City landing page (design+dev)', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Local citations (15 directories)', { setup: 400 }, { setup: 2 }),
      flatWithLabour('City-specific keyword research', { setup: 300 }, { setup: 2 }),
      flatWithLabour('GBP location setup', { setup: 300 }, { setup: 2 }),
      flatWithLabour('City schema markup', { setup: 200 }, { setup: 1 }),
      monthlyItem('BrightLocal citation tool', 100, 30, 1000),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  // --- Ongoing management ---

  {
    id: 'account-manager',
    label: 'Dedicated Growth Manager',
    icon: 'UserCheck',
    section: 'care',
    items: [
      flatWithLabour('Slack/WhatsApp priority channel', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('Monthly 1-hr strategy call', { monthly: 500, annual: 5000 }, { monthly: 1.5, annual: 15 }),
      flatWithLabour('Strategy deck + KPI report (10 slides)', { monthly: 500, annual: 5000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Quarterly business review deck', { monthly: 400, annual: 4000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Notion/Linear task management', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('4-hr response SLA (biz hrs)', { monthly: 300, annual: 3000 }, { monthly: 0.5, annual: 5 }),
      flatWithLabour('Weekly async update + action items', { monthly: 300, annual: 3000 }, { monthly: 1, annual: 10 }),
    ],
  },
  {
    id: 'unlimited-updates',
    label: 'Content & Page Updates — Up to 10 hrs/month',
    icon: 'RefreshCw',
    section: 'care',
    items: [
      flatWithLabour('Content update labor', { monthly: 1000, annual: 10000 }, { monthly: 10, annual: 100 }),
      flatWithLabour('Design tweaks in Figma', { monthly: 400, annual: 4000 }, { monthly: 1.5, annual: 15 }),
      flatWithLabour('Development + deploy', { monthly: 400, annual: 4000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('QA + regression testing', { monthly: 300, annual: 3000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Image replacement + optimization', { monthly: 200, annual: 2000 }, { monthly: 1, annual: 10 }),
    ],
  },
  {
    id: 'social-reels',
    label: 'Social Media — Reels & Stories',
    icon: 'Video',
    section: 'stay-active',
    items: [
      flatWithLabour('Content ideation + storyboards', { monthly: 600 }, { monthly: 4 }),
      monthlyItem('Stock footage (Artgrid/Storyblocks)', 300, 40, 3000),
      monthlyItem('Video editing (CapCut Pro)', 150, 40, 1500),
      flatWithLabour('Trending audio research', { monthly: 200 }, { monthly: 1 }),
      flatWithLabour('Motion graphics + text overlays', { monthly: 400 }, { monthly: 3 }),
      flatWithLabour('Caption writing + hashtag pack', { monthly: 200 }, { monthly: 1.5 }),
      flatWithLabour('Instagram Stories design (8/mo)', { monthly: 500 }, { monthly: 4 }),
      flatWithLabour('Posting schedule + tracking', { monthly: 200 }, { monthly: 1 }),
    ],
  },
  {
    id: 'google-ads-management',
    label: 'Google Ads Management — Search, Maps & Video',
    icon: 'Search',
    section: 'grow',
    items: [
      flatWithLabour('Search Ads — weekly bid + keyword optimization', { monthly: 500 }, { monthly: 3 }),
      flatWithLabour('Maps Ads — geo-performance tuning', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('Performance Max — asset refresh + optimization', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('YouTube Ads — video performance review', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('A/B testing (2 variants/month)', { monthly: 300 }, { monthly: 2 }),
      flatWithLabour('Search term mining + negative keyword adds', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Remarketing audience setup + refresh', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Performance dashboard (Looker Studio)', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('Monthly ads performance report', { monthly: 300 }, { monthly: 1.5 }),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹5K–25K/mo recommended)',
  },
  {
    id: 'meta-ads-management',
    label: 'Meta Ads Management — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      flatWithLabour('Facebook — weekly bid + audience optimization', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('Instagram — creative refresh + Reels ad optimization', { monthly: 400 }, { monthly: 2 }),
      monthlyItem('WhatsApp — WATI/Interakt platform', 500, 40, 5000),
      monthlyItem('WhatsApp — marketing conversation costs (~50/mo)', 250, 30, 2500),
      flatWithLabour('WhatsApp — template updates + flow optimization', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Messenger — auto-reply flow updates', { monthly: 200 }, { monthly: 1 }),
      flatWithLabour('A/B testing (2 variants/month)', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Creative refresh (4 new ads/month)', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('Audience refinement + exclusions', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Remarketing campaign management', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Advantage+ / dynamic creative optimization', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Competitor ad analysis', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Monthly performance report', { monthly: 300 }, { monthly: 1 }),
    ],
    clientCostNote: 'Ad budget paid directly to Meta (~₹10K–50K/mo recommended)',
  },
  {
    id: 'competitor',
    label: 'Competitor & Market Analysis',
    icon: 'BarChart3',
    section: 'grow',
    items: [
      flatWithLabour('Competitor website audit (3)', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('SEMrush domain comparison', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('SWOT analysis document', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Market positioning recommendations', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('Gap analysis — services you lack', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('PDF report with exec summary', { monthly: 300 }, { monthly: 1.5 }),
      monthlyItem('SimilarWeb traffic estimation', 100, 30, 1000),
    ],
  },
  // --- Priority & multi-location ---

  {
    id: 'scale-priority',
    label: 'Same-day priority support',
    icon: 'Zap',
    section: 'care',
    items: [
      flatWithLabour('Priority queue in support system', { monthly: 0 }, { monthly: 0.5 }),
      flatWithLabour('2-hr response SLA (biz hrs)', { monthly: 500 }, { monthly: 1 }),
      monthlyItem('Emergency hotline routing', 100, 40, 1000),
    ],
  },
  {
    id: 'scale-multi',
    label: 'Multi-location',
    icon: 'Building',
    section: 'get-found',
    items: [
      flatWithLabour('Additional GBP setup', { setup: 600 }, { setup: 3 }),
      flatWithLabour('Location landing page', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Local citations for new loc', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Location schema + geo sitemap', { setup: 300 }, { setup: 1 }),
      monthlyItem('BrightLocal citation tool', 150, 30, 1500),
    ],
    deliverDays: 1, stage: 'build',
  },
  // --- Website add-ons (continued) ---

  {
    id: 'business-email',
    label: 'Business Email Setup',
    icon: 'Mail',
    section: 'build',
    items: [
      flatWithLabour('Zoho Mail account setup + domain verification', { setup: 500 }, { setup: 1.5 }),
      flatWithLabour('DNS MX record configuration', { setup: 200 }, { setup: 0.5 }),
      flatWithLabour('SPF + DKIM + DMARC email authentication', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Email signature design + setup', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Forwarding rules + aliases', { setup: 150 }, { setup: 0.5 }),
      flatWithLabour('IMAP/SMTP guide for mobile + desktop', { setup: 150 }, { setup: 0.5 }),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },
  {
    id: 'staff-training',
    label: 'Staff Handover Training — 1–2 Hour Session',
    icon: 'Users',
    section: 'care',
    items: [
      flatWithLabour('WhatsApp Business reply guide + templates', { setup: 300 }, { setup: 2 }),
      flatWithLabour('GBP posting guide (offers, photos, replies)', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Basic website CMS walkthrough', { setup: 300 }, { setup: 1 }),
      flatWithLabour('SMS / email campaign dashboard overview', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Live session delivery (1–2 hrs)', { setup: 500 }, { setup: 2 }),
      flatWithLabour('Quick reference cheat sheet (PDF)', { setup: 200 }, { setup: 1 }),
    ],
    deliverDays: 1,
  },
  {
    id: 'branding-identity',
    label: 'Logo & Branding — Identity + Guidelines',
    icon: 'Palette',
    section: 'build',
    items: [
      flatWithLabour('Logo design — 3 concepts + 2 revisions', { setup: 600 }, { setup: 6 }),
      flatWithLabour('Color palette — primary + secondary + accent', { setup: 200 }, { setup: 2 }),
      flatWithLabour('Typography selection — heading + body fonts', { setup: 0 }, { setup: 1 }),
      flatWithLabour('Logo variations — light/dark BG + icon-only', { setup: 300 }, { setup: 3 }),
      flatWithLabour('Favicon + app icon generation (all sizes)', { setup: 200 }, { setup: 2 }),
      flatWithLabour('Social media profile picture versions', { setup: 200 }, { setup: 2 }),
      flatWithLabour('Brand guidelines one-pager (PDF)', { setup: 300 }, { setup: 3 }),
      flatWithLabour('Source files — AI/SVG/PNG — delivered via drive', { setup: 0 }, { setup: 0.5 }),
    ],
    deliverDays: 3, stage: 'design',
  },
  {
    id: 'brochure-pdf',
    label: 'Brochure / Catalog PDF — WhatsApp Optimized',
    icon: 'FileText',
    section: 'build',
    items: [
      flatWithLabour('Design — 4 page A4 / digital layout', { setup: 600 }, { setup: 6 }),
      flatWithLabour('Content writing — services + about + contact', { setup: 500 }, { setup: 5 }),
      oneTimeItem('Stock / client photo sourcing (8 images)', 200, 50),
      flatWithLabour('PDF compression for WhatsApp sharing', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Mobile + print optimized export', { setup: 200 }, { setup: 1 }),
    ],
    deliverDays: 1, stage: 'design',
  },
  {
    id: 'ordering-page',
    label: 'Online Ordering Page — WhatsApp Form',
    icon: 'ShoppingCart',
    section: 'automate',
    items: [
      flatWithLabour('Order form design (items, quantity, note)', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Form fields — name, phone, address, special request', { setup: 200 }, { setup: 1 }),
      flatWithLabour('WhatsApp submission integration', { setup: 300 }, { setup: 2 }),
      flatWithLabour('Order confirmation auto-reply template', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Deploy + testing', { setup: 200 }, { setup: 1.5 }),
    ],
    deliverDays: 1, stage: 'build',
  },
  // --- Marketing & campaigns ---

  {
    id: 'email-marketing-setup',
    label: 'Email Marketing Setup — Templates + Automation + List Import',
    icon: 'Mail',
    section: 'automate',
    items: [
      oneTimeItem('Platform setup (Brevo/Mailchimp/MailerLite)', 1300, 30),
      flatWithLabour('Branded newsletter template (HTML)', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Subscriber list import + segmentation', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Welcome email automation flow', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Signup form embed on website', { setup: 200 }, { setup: 1 }),
      flatWithLabour('GDPR / opt-in compliance setup', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Test send + deliverability check', { setup: 0 }, { setup: 0.5 }),
    ],
    deliverDays: 0.5, stage: 'build',
  },
  {
    id: 'email-marketing',
    label: 'Email Marketing Management — Campaigns + Optimization + Reporting',
    icon: 'Mail',
    section: 'automate',
    items: [
      flatWithLabour('Monthly newsletter campaigns (2–4 sends)', { monthly: 600 }, { monthly: 4 }),
      flatWithLabour('Content + copywriting for campaigns', { monthly: 500 }, { monthly: 3 }),
      flatWithLabour('Template updates + seasonal designs', { monthly: 400 }, { monthly: 2 }),
      flatWithLabour('A/B subject line testing + optimization', { monthly: 300 }, { monthly: 1.5 }),
      flatWithLabour('List cleaning + inactive subscriber pruning', { monthly: 200 }, { monthly: 1 }),
      flatWithLabour('Re-engagement campaign (quarterly)', { monthly: 250 }, { monthly: 1.5 }),
      flatWithLabour('Performance analytics report', { monthly: 300 }, { monthly: 1.5 }),
    ],
  },
  {
    id: 'sms-marketing',
    label: 'SMS Marketing — Offers, Reminders & Alerts',
    icon: 'Send',
    section: 'automate',
    items: [
      flatWithLabour('SMS platform setup (Twilio/Textlocal/Exotel)', { setup: 0 }, { setup: 1.5 }),
      flatWithLabour('DND scrub + TRAI compliance registration', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Message templates — appointment, offer, reminder', { setup: 400 }, { setup: 2 }),
      flatWithLabour('DLT template registration (India)', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Campaign scheduling + automation', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Opt-out / STOP handling in templates', { setup: 100 }, { setup: 0.5 }),
      monthlyItem('SMS sending costs (~500 msgs/month)', 250, 10, 2500),
      flatWithLabour('Monthly delivery + conversion report', { monthly: 200 }, { monthly: 1 }),
    ],
    clientCostNote: 'SMS credits paid directly to provider (~₹0.25–0.50/msg). Estimated 500 msgs = ~₹200/mo.',
  },
  {
    id: 'blog-content',
    label: 'Blog / Content Writing — 2–4 Posts/Month',
    icon: 'PenLine',
    section: 'stay-active',
    items: [
      flatWithLabour('Topic research + keyword selection', { monthly: 300, annual: 3000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Writing — 600–800 words per post', { monthly: 500, annual: 5000 }, { monthly: 4, annual: 40 }),
      monthlyItem('Featured image sourcing + optimization', 200, 50),
      flatWithLabour('On-page SEO — headings, meta, internal links', { monthly: 300, annual: 3000 }, { monthly: 2, annual: 20 }),
      flatWithLabour('Publishing + formatting on website', { monthly: 200, annual: 2000 }, { monthly: 1, annual: 10 }),
      flatWithLabour('Monthly content performance report', { monthly: 200, annual: 2000 }, { monthly: 1, annual: 10 }),
    ],
    deliverDays: 0.25, parallel: true,
  },
  {
    id: 'qr-suite',
    label: 'QR Suite — Menu + UPI Payment + WhatsApp',
    icon: 'QrCode',
    section: 'automate',
    items: [
      flatWithLabour('QR code generation (mobile-responsive)', { setup: 0 }, { setup: 0.5 }),
      flatWithLabour('Menu landing page design (responsive)', { setup: 500 }, { setup: 3 }),
      flatWithLabour('UPI payment link / QR integration', { setup: 0 }, { setup: 0.5 }),
      flatWithLabour('WhatsApp click-to-chat QR link', { setup: 0 }, { setup: 0.5 }),
      flatWithLabour('Printable A4 PDF with all 3 QR codes', { setup: 400 }, { setup: 2 }),
      flatWithLabour('Sticker / table stand design (print-ready)', { setup: 300 }, { setup: 2 }),
    ],
    deliverDays: 1, stage: 'design',
  },
  {
    id: 'festive-campaign',
    label: 'Festive Campaign Pack — Diwali / Holi / New Year',
    icon: 'Sparkles',
    section: 'grow',
    items: [
      flatWithLabour('Campaign theme design + branding', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Social media posts (5) — Instagram + Facebook', { setup: 600 }, { setup: 4 }),
      flatWithLabour('Email blast template + send', { setup: 400 }, { setup: 2 }),
      flatWithLabour('SMS broadcast template + send', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('WhatsApp Business broadcast template', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Festive offer / discount creative (2 variants)', { setup: 300 }, { setup: 2 }),
    ],
    deliverDays: 2, stage: 'design', clientCostNote: 'SMS credits billed separately (~₹0.25–0.50/msg per broadcast)',
  },
  {
    id: 'appointment-booking',
    label: 'Online Appointment Booking Page',
    icon: 'Calendar',
    section: 'automate',
    items: [
      flatWithLabour('Booking page design (branded, responsive)', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Time slot + availability configuration', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Service / treatment selection menu', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('WhatsApp + email booking confirmation', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Google Calendar auto-sync', { setup: 0 }, { setup: 0.5 }),
      flatWithLabour('Admin dashboard walkthrough + guide', { setup: 200 }, { setup: 1 }),
      flatWithLabour('Mobile + desktop testing', { setup: 100 }, { setup: 1 }),
    ],
    deliverDays: 1.5, stage: 'build',
  },
  // --- AI services ---

  {
    id: 'ai-chatbot',
    label: 'AI Chatbot — WhatsApp + Website 24/7 Auto-Reply',
    icon: 'Bot',
    section: 'automate',
    items: [
      monthlyItem('WATI / Interakt AI bot subscription', 500, 40, 5000),
      flatWithLabour('FAQ knowledge base setup (50+ Q&A)', { setup: 1000 }, { setup: 6 }),
      flatWithLabour('Business context + tone prompt engineering', { setup: 600 }, { setup: 3 }),
      flatWithLabour('24/7 auto-reply flow — greeting + FAQ + handoff', { setup: 700 }, { setup: 4 }),
      flatWithLabour('Fallback to human trigger setup', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Monthly conversation review + prompt tuning', { monthly: 600 }, { monthly: 3 }),
    ],
    deliverDays: 1.5, parallel: true,
  },
  {
    id: 'ai-content',
    label: 'AI Content Writer — Blogs + Social Captions + Emails',
    icon: 'Wand2',
    section: 'stay-active',
    items: [
      monthlyItem('OpenAI API credits + usage (~20K tokens/mo)', 200, 10, 2000),
      flatWithLabour('Brand voice + style guide prompt setup', { setup: 500 }, { setup: 2 }),
      flatWithLabour('Blog post generation + editing (4/month)', { monthly: 750 }, { monthly: 2.5 }),
      flatWithLabour('Social media caption generation (8/month)', { monthly: 600 }, { monthly: 2 }),
      flatWithLabour('Email newsletter draft generation (2/month)', { monthly: 450 }, { monthly: 1.5 }),
      flatWithLabour('SEO keyword + meta description generation', { monthly: 300 }, { monthly: 1 }),
      flatWithLabour('Human review + polishing before publish', { monthly: 450, annual: 4500 }, { monthly: 3, annual: 30 }),
    ],
    deliverDays: 0.25, parallel: true,
  },
  {
    id: 'ai-review-manager',
    label: 'AI Review Manager — Auto-Replies + Monthly Summary',
    icon: 'Star',
    section: 'get-found',
    items: [
      monthlyItem('OpenAI API credits + usage (~5K tokens/mo)', 100, 10, 1000),
      flatWithLabour('Review monitoring — Google + Facebook + Justdial', { monthly: 0 }, { monthly: 1 }),
      flatWithLabour('Auto-response prompt engineering (per platform)', { setup: 800 }, { setup: 4 }),
      flatWithLabour('Positive review — thank you + upsell reply', { monthly: 400 }, { monthly: 1.5 }),
      flatWithLabour('Negative review — empathetic + resolution reply', { monthly: 500 }, { monthly: 1.5 }),
      flatWithLabour('Sentiment analysis + escalation rules', { monthly: 450 }, { monthly: 1.5 }),
      flatWithLabour('Monthly review sentiment report', { monthly: 450 }, { monthly: 1.5 }),
    ],
    deliverDays: 0.5, parallel: true,
  },
  {
    id: 'ai-lead-qualifier',
    label: 'AI Lead Qualifier — Auto-Questions + Scoring on WhatsApp',
    icon: 'Filter',
    section: 'grow',
    items: [
      monthlyItem('WATI / Interakt bot flow + OpenAI integration', 500, 40, 5000),
      flatWithLabour('Qualification script — budget, timeline, requirements', { setup: 900 }, { setup: 4 }),
      flatWithLabour('Intent detection prompt setup', { setup: 500 }, { setup: 2 }),
      flatWithLabour('Lead scoring rules — hot/warm/cold', { setup: 450 }, { setup: 2 }),
      flatWithLabour('Hot lead → instant WhatsApp notification to you', { setup: 300 }, { setup: 1.5 }),
      flatWithLabour('Monthly conversion + lead quality report', { monthly: 500 }, { monthly: 2 }),
    ],
    deliverDays: 1, parallel: true,
  },
  {
    id: 'ai-product-photos',
    label: 'AI Product Photos — Studio Quality Without Photoshoot',
    icon: 'Image',
    section: 'stay-active',
    items: [
      flatWithLabour('Product photo guidelines — angles, lighting instructions', { setup: 250 }, { setup: 1.5 }),
      flatWithLabour('Midjourney / DALL-E prompt engineering per product', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Background generation + product placement (10 photos)', { setup: 800 }, { setup: 4 }),
      oneTimeItem('AI generation credits (Midjourney/DALL-E)', 1500, 10),
      flatWithLabour('Manual edits + color correction + resize', { setup: 500 }, { setup: 3 }),
      flatWithLabour('Web + social media optimized delivery', { setup: 250 }, { setup: 1 }),
    ],
    deliverDays: 2, stage: 'design',
  },
  // --- Custom software tools ---

  {
    id: 'custom-software',
    label: 'Custom Software Development — Dashboards, CRMs, Internal Tools',
    icon: 'Code',
    section: 'custom-software',
    items: [
      flatWithLabour('Discovery + scope document', { setup: 2000 }, { setup: 8 }),
      flatWithLabour('Screen designs + clickable mockups', { setup: 2000 }, { setup: 8 }),
      flatWithLabour('Customer-facing screens & dashboards', { setup: 4000 }, { setup: 15 }),
      flatWithLabour('Business rules & data processing', { setup: 6000 }, { setup: 20 }),
      flatWithLabour('Data storage & organization', { setup: 2000 }, { setup: 5 }),
      flatWithLabour('Staff login & role-based access', { setup: 2000 }, { setup: 5 }),
      flatWithLabour('Admin panel — manage records, filter, export', { setup: 4000 }, { setup: 15 }),
      flatWithLabour('Charts, graphs & KPI dashboards', { setup: 2000 }, { setup: 8 }),
      flatWithLabour('Kanban board — drag & drop pipeline', { setup: 1500 }, { setup: 6 }),
      flatWithLabour('Search, sort & advanced filters', { setup: 800 }, { setup: 4 }),
      flatWithLabour('Email & in-app notifications + reminders', { setup: 1200 }, { setup: 5 }),
      flatWithLabour('Automated workflows & triggers', { setup: 1500 }, { setup: 6 }),
      flatWithLabour('Activity log — who did what, when', { setup: 800 }, { setup: 4 }),
      flatWithLabour('Import existing data (Excel / CSV)', { setup: 800 }, { setup: 4 }),
      flatWithLabour('Customer portal — clients track their status', { setup: 2000 }, { setup: 10 }),
      flatWithLabour('Integrations — payments, email, SMS, WhatsApp', { setup: 2000 }, { setup: 10 }),
      flatWithLabour('File uploads — images, PDFs, documents', { setup: 1200 }, { setup: 5 }),
      flatWithLabour('Live updates — chat, notifications, statuses', { setup: 2000 }, { setup: 8 }),
      flatWithLabour('Reports & invoices (PDF)', { setup: 1200 }, { setup: 5 }),
      flatWithLabour('Testing before launch', { setup: 2000 }, { setup: 10 }),
      flatWithLabour('Deployment — staging + live setup', { setup: 1200 }, { setup: 5 }),
      flatWithLabour('User guide & admin manual', { setup: 800 }, { setup: 4 }),
      flatWithLabour('30-day support after launch', { setup: 1200 }, { setup: 8 }),
      flatWithLabour('Team training & handover session', { setup: 800 }, { setup: 4 }),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Infrastructure costs (hosting, database, domain) are billed separately by the client.',
  },
  {
    id: 'billing-invoicing',
    label: 'Billing & GST Invoicing',
    icon: 'Receipt',
    section: 'custom-software',
    items: [
      flatWithLabour('GST invoices — CGST, SGST & IGST breakdown', { setup: 2000 }, { setup: 8 }),
      flatWithLabour('Customer & item management', { setup: 1500 }, { setup: 6 }),
      flatWithLabour('Payment tracking — paid, pending, overdue', { setup: 1000 }, { setup: 4 }),
      flatWithLabour('UPI / payment links on every invoice', { setup: 1000 }, { setup: 4 }),
      flatWithLabour('Recurring invoices for subscriptions', { setup: 1000 }, { setup: 4 }),
      flatWithLabour('Invoice email + WhatsApp share', { setup: 800 }, { setup: 4 }),
      flatWithLabour('Reports — revenue, outstanding, GST summary', { setup: 1000 }, { setup: 5 }),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Payment gateway fees billed separately by Razorpay.',
  },
]

// ---------------------------------------------------------------------------
// Build the lookup map
// ---------------------------------------------------------------------------

const _serviceMap: Record<string, Service> = {}
for (const svc of SERVICES) {
  _serviceMap[svc.id] = svc
}

// ---------------------------------------------------------------------------
// Catalog validation — fail fast on data errors so bad catalog data never ships
// silently (duplicate ids would otherwise overwrite each other in the map).
// ---------------------------------------------------------------------------

function assertUniqueIds<T extends { id: string }>(items: T[], scope: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate ${scope} id: "${item.id}"`)
    seen.add(item.id)
  }
}

// Reject impossible catalog data: negative costs/markups/selling prices tell you
// the catalog is broken long before any customer is misquoted.
function assertPositivePrices(item: ServiceItem): void {
  const { setup: cs, monthly: cm, annual: ca } = item.costPrice
  const { setup: ms, monthly: mm, annual: ma } = item.markupPct
  if (cs < 0 || cm < 0 || ca < 0) throw new Error(`Negative cost on item "${item.label}"`)
  if (ms < 0 || mm < 0 || ma < 0) throw new Error(`Negative markup on item "${item.label}"`)
  const s = item.sellingPrice
  const tiers: Array<[number | undefined, string]> = [
    [s?.setup, 'setup'],
    [s?.monthly, 'monthly'],
    [s?.annual, 'annual'],
  ]
  for (const [val, tier] of tiers) {
    if (val !== undefined && val < 0) throw new Error(`Negative selling price on "${item.label}" (${tier})`)
  }
}

for (const svc of SERVICES) {
  for (const item of svc.items) assertPositivePrices(item)
}

// Guard: every service must have matching marketing copy, so a missing
// service-detail page never ships silently.
for (const svc of SERVICES) {
  if (!SERVICE_CONTENT[svc.id]) {
    throw new Error(`Missing SERVICE_CONTENT for service "${svc.id}"`)
  }
}

assertUniqueIds(SERVICES, 'service')

export function pickServices(ids: string[]): Service[] {
  return ids.map((id) => {
    const svc = _serviceMap[id]
    if (!svc) throw new Error(`Unknown service: ${id}`)
    return structuredClone(svc)
  })
}

export interface ServiceBundle {
  services: Service[]
  addOns: Service[]
  pricing: { setup: number; monthly: number; annual: number }
}

export function resolveServiceBundle(serviceIds: string[], addOnIds: string[] = []): ServiceBundle {
  const services = pickServices(serviceIds)
  const addOns = pickServices(addOnIds)
  for (const svc of [...services, ...addOns]) {
    svc.aggregate = computeServiceAggregate(svc)
  }
  const pricing = {
    setup: [...services, ...addOns].reduce((sum, svc) => sum + (svc.aggregate?.selling.setup ?? 0), 0),
    monthly: [...services, ...addOns].reduce((sum, svc) => sum + (svc.aggregate?.selling.monthly ?? 0), 0),
    annual: [...services, ...addOns].reduce((sum, svc) => sum + (svc.aggregate?.selling.annual ?? 0), 0),
  }
  return { services, addOns, pricing }
}


// Public "services offered" shape — marketing fields only, no internal cost
// breakdown or pricing. Powers the services page (prices hidden there).
export interface PublicService {
  id: string
  label: string
  description: string
  icon: string
  section: string
  stage?: ServiceStage
  details: string
  benefits: string[]
  overview: string[]
  howItWorks: string[]
  faqs: ServiceFaq[]
}

export function getPublicServices(): PublicService[] {
  return Object.values(_serviceMap).map((svc) => {
    const content = SERVICE_CONTENT[svc.id] ?? {}
    return {
      id: svc.id,
      label: svc.label,
      description: content.description ?? '',
      icon: svc.icon ?? 'FileText',
      section: svc.section ?? 'build',
      stage: svc.stage,
      details: content.details ?? '',
      benefits: content.benefits ?? [],
      overview: content.overview ?? [],
      howItWorks: content.howItWorks ?? [],
      faqs: content.faqs ?? [],
    }
  })
}
