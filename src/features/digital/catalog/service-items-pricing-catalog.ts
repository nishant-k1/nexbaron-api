// Service pricing catalog — the single source of truth for every service we
// sell and what it costs to deliver.
//
// Pricing model (per item):
//   selling = round(costPrice × (1 + profitMarginPct / 100))
//   a `sellingPrice` override (flat-price items) wins over the formula.
//   Tiers per item: setup (one-time) · monthly · annual.
//
// A Service bundles many items; its `aggregate` sums them. Plans
// (service-package-pricing-catalog.ts) pick services + add-ons, and
// enrichCatalog() totals each plan by summing the services' selling prices —
// higher plans inherit lower plans cumulatively.
//
// To change pricing, edit the `items` below (costPrice + profitMarginPct, or a
// flat sellingPrice) — the rest is computed, never hand-edited.

import { SERVICE_CONTENT } from './service-content'

export type ServiceStage = 'design' | 'build' | 'setup'

export interface ServiceItem {
  label: string
  costPrice: { setup: number; monthly: number; annual: number } // INR
  profitMarginPct: { setup: number; monthly: number; annual: number } // markup percentage (40 = 40%)
  sellingPrice?: { setup?: number; monthly?: number; annual?: number } // optional INR override
}

export interface ServiceAggregate {
  cost: { setup: number; monthly: number; annual: number } // INR
  selling: { setup: number; monthly: number; annual: number } // INR
  marginPct: { setup: number; monthly: number; annual: number } // effective margin percentage
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
  sharedInfra: { category: string; label: string; monthlyCost: number; upgradePath?: string; upgradeCost?: number }[]
  plans: Plan[]
}

// ---------------------------------------------------------------------------
// Compute helpers
// ---------------------------------------------------------------------------

function selling(cost: number, marginPct: number): number {
  return Math.round(cost * (1 + marginPct / 100))
}

export function computeItemSelling(item: ServiceItem) {
  return {
    setup: item.sellingPrice?.setup ?? selling(item.costPrice.setup, item.profitMarginPct.setup),
    monthly: item.sellingPrice?.monthly ?? selling(item.costPrice.monthly, item.profitMarginPct.monthly),
    annual: item.sellingPrice?.annual ?? selling(item.costPrice.annual, item.profitMarginPct.annual),
  }
}

export function computeServiceAggregate(svc: Service): ServiceAggregate {
  let costSetup = 0
  let costMonthly = 0
  let costAnnual = 0
  let sellSetup = 0
  let sellMonthly = 0
  let sellAnnual = 0

  for (const item of svc.items) {
    const sell = computeItemSelling(item)
    costSetup += item.costPrice.setup
    costMonthly += item.costPrice.monthly
    costAnnual += item.costPrice.annual
    sellSetup += sell.setup
    sellMonthly += sell.monthly
    sellAnnual += sell.annual
  }

  return {
    cost: { setup: costSetup, monthly: costMonthly, annual: costAnnual },
    selling: { setup: sellSetup, monthly: sellMonthly, annual: sellAnnual },
    marginPct: {
      setup: costSetup > 0 ? Math.round((sellSetup - costSetup) / costSetup * 100) : 0,
      monthly: costMonthly > 0 ? Math.round((sellMonthly - costMonthly) / costMonthly * 100) : 0,
      annual: costAnnual > 0 ? Math.round((sellAnnual - costAnnual) / costAnnual * 100) : 0,
    },
  }
}

export function enrichCatalog(catalog: PlanCatalog): PlanCatalog {
  let cumSetup = 0
  let cumMonthly = 0
  let cumAnnual = 0

  for (const plan of catalog.plans) {
    for (const svc of [...plan.services, ...plan.addOns]) {
      svc.aggregate = computeServiceAggregate(svc)
    }

    // Base package price = services only (add-ons are optional extras chosen at checkout).
    const ownSetup = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.setup ?? 0), 0)
    const ownMonthly = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.monthly ?? 0), 0)
    const ownAnnual = plan.services.reduce((sum, svc) => sum + (svc.aggregate?.selling.annual ?? 0), 0)

    // The Custom plan is quote-based — no fixed price.
    if (plan.id !== 'custom') {
      cumSetup += ownSetup
      cumMonthly += ownMonthly
      cumAnnual += ownAnnual
      plan.pricing = { setup: cumSetup, monthly: cumMonthly, annual: cumAnnual, ownSetup, ownMonthly, ownAnnual }
    }
  }
  return catalog
}

// ---------------------------------------------------------------------------
// Service item builders — use these to define `items` in SERVICES below.
//
// Cost model:  selling = round(cost × (1 + marginPct/100))
//              (a `sellingPrice` override — flat-price items — wins instead)
//
//   oneTimeItem('Domain', 800, 30)      → ₹800 one-time cost + 30%  = ₹1,040
//   monthlyItem('Hosting', 300, 50)     → ₹300/mo cost + 50%        = ₹450/mo
//   flatOneTime('Setup', 2000)          → flat ₹2,000 (no cost)
//   flatMonthly('Care', 400)            → flat ₹400/mo (no cost)
//   freeItem('GA4 setup')               → ₹0
// ---------------------------------------------------------------------------

function buildItem(
  label: string,
  costSetup: number,
  costMonthly: number,
  costAnnual: number,
  marginPctSetup: number,
  marginPctMonthly: number,
  marginPctAnnual: number,
  sellSetup?: number,
  sellMonthly?: number,
  sellAnnual?: number,
): ServiceItem {
  const result: ServiceItem = {
    label,
    costPrice: { setup: costSetup, monthly: costMonthly, annual: costAnnual },
    profitMarginPct: { setup: marginPctSetup, monthly: marginPctMonthly, annual: marginPctAnnual },
  }
  if (sellSetup !== undefined || sellMonthly !== undefined || sellAnnual !== undefined) {
    result.sellingPrice = { setup: sellSetup ?? 0, monthly: sellMonthly ?? 0, annual: sellAnnual ?? 0 }
  }
  return result
}

// One-time deliverable at a fixed selling price (no cost decomposition).
function flatOneTime(label: string, sell: number): ServiceItem {
  return buildItem(label, 0, 0, 0, 0, 0, 0, sell)
}

// One-time deliverable: cost + markup %. Selling = cost × (1 + marginPct/100).
function oneTimeItem(label: string, cost: number, marginPct: number): ServiceItem {
  return buildItem(label, cost, 0, 0, marginPct, 0, 0)
}

// Monthly recurring at a fixed selling price (no cost decomposition).
function flatMonthly(label: string, sell: number): ServiceItem {
  return buildItem(label, 0, 0, 0, 0, 0, 0, undefined, sell)
}

// Monthly recurring: cost + markup %. Pass annualCost to also price the annual tier.
function monthlyItem(label: string, cost: number, marginPct: number, annualCost = 0): ServiceItem {
  return buildItem(label, 0, cost, annualCost, 0, marginPct, annualCost > 0 ? marginPct : 0)
}

// No cost, no charge.
function freeItem(label: string): ServiceItem {
  return buildItem(label, 0, 0, 0, 0, 0, 0)
}

// ---------------------------------------------------------------------------
// Shared infrastructure
// ---------------------------------------------------------------------------

export const SHARED_INFRA: PlanCatalog['sharedInfra'] = [
  { category: 'Version Control', label: 'GitHub Free', monthlyCost: 0, upgradePath: 'GitHub Team', upgradeCost: 1750 },
  { category: 'Deployment', label: 'Vercel Hobby', monthlyCost: 0, upgradePath: 'Vercel Pro', upgradeCost: 1700 },
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
// ---------------------------------------------------------------------------

export const SERVICES: Service[] = [

  // --- Website & online presence ---

  {
    id: 'website',
    label: 'Website — Up to 5 Pages',
    icon: 'Globe',
    section: 'build',
    items: [
      oneTimeItem('Domain Registration', 800, 30),
      oneTimeItem('Domain Privacy Protection', 200, 30),
      oneTimeItem('SSL Certificate', 300, 40),
      monthlyItem('Cloud Hosting', 300, 50, 3000),
      monthlyItem('S3 / Asset Storage', 80, 30, 800),
      flatOneTime('CDN Setup (Cloudflare)', 2000),
      flatOneTime('DNS Configuration', 500),
      flatOneTime('Git Repository Setup', 300),
      flatOneTime('CI/CD Pipeline', 600),
      flatOneTime('Design — Figma mockups', 600),
      flatOneTime('Development — Next.js build', 1000),
      flatOneTime('Content writing (5 pgs)', 800),
      oneTimeItem('Image sourcing (10 imgs)', 300, 50),
      flatOneTime('Mobile responsive testing', 300),
      flatOneTime('Cross-browser testing', 300),
      flatOneTime('SEO meta tags + sitemap', 400),
      freeItem('GA4 property setup'),
      freeItem('Google Search Console setup'),
      flatOneTime('Lighthouse perf optimization', 400),
      flatOneTime('Security headers hardening', 400),
      monthlyItem('Daily backups', 100, 30, 1000),
      flatMonthly('Uptime monitoring', 400),
      flatOneTime('Privacy policy template', 200),
    ],
    deliverDays: 1, stage: 'build',
  },

  {
    id: 'whatsapp',
    label: 'WhatsApp Chat Button',
    icon: 'MessageSquare',
    section: 'build',
    items: [
      freeItem('WhatsApp Business Account'),
      flatOneTime('Chat bubble + pre-chat name/phone form', 300),
      flatOneTime('Click-to-chat deep link + offline message', 250),
      monthlyItem('WA API conversation costs', 50, 40, 500),
      flatOneTime('Chat click tracking + analytics', 100),
      flatOneTime('Mobile + desktop testing', 150),
    ],
    deliverDays: 0, stage: 'build',
  },

  {
    id: 'gbp',
    label: 'Google Business Profile — Setup & Verify',
    icon: 'MapPin',
    section: 'build',
    items: [
      flatOneTime('Business verification (postcard handling)', 300),
      flatOneTime('Business info + hours setup', 250),
      flatOneTime('Category + service area setup', 300),
      flatOneTime('Photo upload + optimization', 300),
      flatOneTime('Q&A section pre-population', 300),
      flatOneTime('Review response templates', 200),
      flatOneTime('Product/menu section setup', 300),
    ],
    deliverDays: 0.5, parallel: true, stage: 'setup',
  },

  {
    id: 'analytics',
    label: 'Visit Analytics',
    icon: 'BarChart3',
    section: 'build',
    items: [
      freeItem('GA4 property + data stream'),
      freeItem('GTM container + triggers'),
      flatOneTime('Event tracking setup', 300),
      flatOneTime('Conversion goal setup', 250),
      flatOneTime('Custom Looker Studio dashboard', 400),
      freeItem('Search Console + sitemap'),
      flatOneTime('UTM parameter standardization', 200),
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
      flatOneTime('Content writing (500 words)', 200),
      flatOneTime('Design layout in Figma', 150),
      flatOneTime('Development + responsive QA', 150),
      oneTimeItem('Image sourcing (2 images)', 50, 50),
      flatOneTime('SEO meta tags for page', 100),
    ],
    unitLabel: 'per page', deliverDays: 0.25, stage: 'build',
  },

  {
    id: 'launch-photos',
    label: 'Additional photos',
    icon: 'Image',
    section: 'build',
    items: [
      oneTimeItem('Stock photo license', 80, 40),
      flatOneTime('Image optimization (WebP/AVIF)', 200),
      flatOneTime('Alt text + SEO metadata', 100),
    ],
    deliverDays: 0.25, stage: 'build',
  },

  {
    id: 'launch-domain',
    label: 'Domain setup',
    icon: 'Link',
    section: 'build',
    items: [
      flatOneTime('DNS record configuration', 300),
      freeItem('Email forwarding setup'),
      flatOneTime('Subdomain configuration', 200),
      flatOneTime('SSL auto-renewal verification', 200),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  // --- SEO & local ranking ---

  {
    id: 'gbp-optimise',
    label: 'Google Business Profile — Optimize & Rank',
    icon: 'MapPin',
    section: 'get-found',
    items: [
      flatMonthly('Weekly GBP posts (4/mo) — offers, updates, photos', 800),
      flatMonthly('Photo optimization + geo-tagging', 300),
      flatMonthly('Offer / promotion post design (Canva)', 300),
      flatMonthly('Review generation campaign + reply drafting', 400),
      flatMonthly('Q&A section monitoring + replies', 200),
      flatMonthly('Competitor GBP analysis (top 3)', 300),
      monthlyItem('Google Maps ranking tracker', 200, 40, 2000),
      monthlyItem('Local Falcon rank checker', 150, 30, 1500),
      flatMonthly('Monthly performance report', 300),
    ],
    deliverDays: 0.5, stage: 'setup',
  },

  {
    id: 'local-seo',
    label: 'Local SEO — Google Maps Ranking',
    icon: 'Search',
    section: 'get-found',
    items: [
      flatMonthly('Local keyword research (30 kw)', 600),
      flatMonthly('Citation building (20+ dirs)', 500),
      flatMonthly('NAP consistency audit', 300),
      flatMonthly('Local backlink outreach (5/mo)', 300),
      flatMonthly('Location page schema markup', 250),
      monthlyItem('BrightLocal / Whitespark tool', 300, 30, 3000),
      flatMonthly('Monthly ranking report', 300),
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
      flatOneTime('Auto-reply greeting flow', 400),
      flatOneTime('Quick replies menu (5 options)', 200),
      flatOneTime('Away message automation', 200),
      flatOneTime('Labels + chat organization', 200),
      flatOneTime('Catalog setup in WhatsApp', 300),
      flatOneTime('Booking flow setup', 400),
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
      freeItem('Review link generator + Google redirect'),
      monthlyItem('SMS review requests (Twilio)', 150, 40, 1500),
      flatMonthly('WhatsApp + email review request automation', 300),
      freeItem('Review monitoring (alerts)'),
      flatMonthly('5-star thank-you + review showcase on website', 300),
      flatMonthly('Negative feedback private redirect', 300),
      flatMonthly('Monthly review performance dashboard', 200),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'social',
    label: 'Social Media — 8 Posts/month',
    icon: 'Share2',
    section: 'stay-active',
    items: [
      flatMonthly('Content calendar planning', 300),
      flatMonthly('Copywriting (8 posts)', 400),
      flatMonthly('Graphic design (8 creatives)', 600),
      monthlyItem('Stock imagery (4 imgs/mo)', 200, 40, 2000),
      flatMonthly('Hashtag research', 200),
      flatMonthly('Engagement monitoring + replies', 200),
      flatMonthly('Monthly social report', 300),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'seo-report',
    label: 'Monthly SEO Health Report',
    icon: 'BarChart3',
    section: 'get-found',
    items: [
      freeItem('Google Search Console data pull'),
      flatMonthly('Keyword position tracking', 200),
      monthlyItem('Technical SEO crawl (Sitebulb)', 200, 30, 2000),
      freeItem('Page speed analysis (Lighthouse)'),
      flatMonthly('Broken link check', 100),
      flatMonthly('Competitor comparison (top 3)', 300),
      flatMonthly('Actionable recommendations', 200),
      flatMonthly('PDF report generation (branded)', 200),
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
      freeItem('Google Ads account + conversion tracking'),
      flatOneTime('Search Ads — keyword research + text ad copy', 600),
      flatOneTime('Maps / Local Services Ads — listing + geo-setup', 500),
      flatOneTime('Performance Max — image assets + headlines', 500),
      flatOneTime('YouTube Ads — bumper + discovery ad setup', 400),
      flatOneTime('Landing page optimization for ads', 300),
      flatOneTime('Ad extensions — call, location, sitelink', 300),
      flatOneTime('Budget strategy + bid management setup', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹2K–10K/mo recommended)',
  },

  {
    id: 'meta-ads-setup',
    label: 'Meta Ads Setup — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      freeItem('Meta Business Suite + Commerce Manager setup'),
      freeItem('FB Pixel + CAPI event setup (shared)'),
      flatOneTime('Facebook Feed + Stories — image ads + copy', 600),
      flatOneTime('Instagram Feed + Stories + Reels — vertical ads', 600),
      monthlyItem('WhatsApp — WATI/Interakt platform subscription', 500, 40, 5000),
      flatOneTime('WhatsApp — Business API message templates', 400),
      freeItem('Messenger — click-to-Messenger flow setup'),
      flatOneTime('Audience research — custom + lookalike', 500),
      flatOneTime('Campaign structure — prospecting + retargeting', 300),
      flatOneTime('Budget strategy + bid setup', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Meta (~₹3K–15K/mo recommended)',
  },

  {
    id: 'growth-city',
    label: 'Cover another city',
    icon: 'MapPin',
    section: 'grow',
    items: [
      flatOneTime('City landing page (design+dev)', 600),
      flatOneTime('Local citations (15 directories)', 400),
      flatOneTime('City-specific keyword research', 300),
      flatOneTime('GBP location setup', 300),
      flatOneTime('City schema markup', 200),
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
      freeItem('Slack/WhatsApp priority channel'),
      flatMonthly('Monthly 1-hr strategy call', 500),
      flatMonthly('Strategy deck + KPI report (10 slides)', 500),
      flatMonthly('Quarterly business review deck', 400),
      freeItem('Notion/Linear task management'),
      flatMonthly('4-hr response SLA (biz hrs)', 300),
      flatMonthly('Weekly async update + action items', 300),
    ],
  },

  {
    id: 'unlimited-updates',
    label: 'Content & Page Updates — Unlimited',
    icon: 'RefreshCw',
    section: 'care',
    items: [
      flatMonthly('Content update labor (~10hrs/mo)', 1000),
      flatMonthly('Design tweaks in Figma', 400),
      flatMonthly('Development + deploy', 400),
      flatMonthly('QA + regression testing', 300),
      flatMonthly('Image replacement + optimization', 200),
    ],
  },

  {
    id: 'social-reels',
    label: 'Social Media — Reels & Stories',
    icon: 'Video',
    section: 'stay-active',
    items: [
      flatMonthly('Content ideation + storyboards', 600),
      monthlyItem('Stock footage (Artgrid/Storyblocks)', 300, 40, 3000),
      monthlyItem('Video editing (CapCut Pro)', 150, 40, 1500),
      flatMonthly('Trending audio research', 200),
      flatMonthly('Motion graphics + text overlays', 400),
      flatMonthly('Caption writing + hashtag pack', 200),
      flatMonthly('Instagram Stories design (8/mo)', 500),
      flatMonthly('Posting schedule + tracking', 200),
    ],
  },

  {
    id: 'google-ads-management',
    label: 'Google Ads Management — Search, Maps & Video',
    icon: 'Search',
    section: 'grow',
    items: [
      flatMonthly('Search Ads — weekly bid + keyword optimization', 500),
      flatMonthly('Maps Ads — geo-performance tuning', 400),
      flatMonthly('Performance Max — asset refresh + optimization', 400),
      flatMonthly('YouTube Ads — video performance review', 300),
      flatMonthly('A/B testing (2 variants/month)', 300),
      flatMonthly('Search term mining + negative keyword adds', 300),
      flatMonthly('Remarketing audience setup + refresh', 300),
      flatMonthly('Performance dashboard (Looker Studio)', 400),
      flatMonthly('Monthly ads performance report', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹5K–25K/mo recommended)',
  },

  {
    id: 'meta-ads-management',
    label: 'Meta Ads Management — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      flatMonthly('Facebook — weekly bid + audience optimization', 400),
      flatMonthly('Instagram — creative refresh + Reels ad optimization', 400),
      monthlyItem('WhatsApp — WATI/Interakt platform', 500, 40, 5000),
      monthlyItem('WhatsApp — marketing conversation costs (~50/mo)', 250, 30, 2500),
      flatMonthly('WhatsApp — template updates + flow optimization', 300),
      flatMonthly('Messenger — auto-reply flow updates', 200),
      flatMonthly('A/B testing (2 variants/month)', 300),
      flatMonthly('Creative refresh (4 new ads/month)', 400),
      flatMonthly('Audience refinement + exclusions', 300),
      flatMonthly('Remarketing campaign management', 300),
      flatMonthly('Advantage+ / dynamic creative optimization', 300),
      flatMonthly('Competitor ad analysis', 300),
      flatMonthly('Monthly performance report', 300),
    ],
    clientCostNote: 'Ad budget paid directly to Meta (~₹10K–50K/mo recommended)',
  },

  {
    id: 'competitor',
    label: 'Competitor & Market Analysis',
    icon: 'BarChart3',
    section: 'grow',
    items: [
      flatMonthly('Competitor website audit (3)', 400),
      freeItem('SEMrush domain comparison'),
      flatMonthly('SWOT analysis document', 300),
      flatMonthly('Market positioning recommendations', 300),
      flatMonthly('Gap analysis — services you lack', 300),
      flatMonthly('PDF report with exec summary', 300),
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
      freeItem('Priority queue in support system'),
      flatMonthly('2-hr response SLA (biz hrs)', 500),
      monthlyItem('Emergency hotline routing', 100, 40, 1000),
    ],
  },

  {
    id: 'scale-multi',
    label: 'Multi-location',
    icon: 'Building',
    section: 'get-found',
    items: [
      flatOneTime('Additional GBP setup', 600),
      flatOneTime('Location landing page', 500),
      flatOneTime('Local citations for new loc', 400),
      flatOneTime('Location schema + geo sitemap', 300),
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
      flatOneTime('Zoho Mail account setup + domain verification', 500),
      flatOneTime('DNS MX record configuration', 200),
      flatOneTime('SPF + DKIM + DMARC email authentication', 200),
      flatOneTime('Email signature design + setup', 200),
      flatOneTime('Forwarding rules + aliases', 150),
      flatOneTime('IMAP/SMTP guide for mobile + desktop', 150),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'staff-training',
    label: 'Staff Handover Training — 1–2 Hour Session',
    icon: 'Users',
    section: 'care',
    items: [
      flatOneTime('WhatsApp Business reply guide + templates', 300),
      flatOneTime('GBP posting guide (offers, photos, replies)', 300),
      flatOneTime('Basic website CMS walkthrough', 300),
      flatOneTime('SMS / email campaign dashboard overview', 200),
      flatOneTime('Live session delivery (1–2 hrs)', 500),
      flatOneTime('Quick reference cheat sheet (PDF)', 200),
    ],
    deliverDays: 1,
  },

  {
    id: 'branding-identity',
    label: 'Logo & Branding — Identity + Guidelines',
    icon: 'Palette',
    section: 'build',
    items: [
      flatOneTime('Logo design — 3 concepts + 2 revisions', 600),
      flatOneTime('Color palette — primary + secondary + accent', 200),
      freeItem('Typography selection — heading + body fonts'),
      flatOneTime('Logo variations — light/dark BG + icon-only', 300),
      flatOneTime('Favicon + app icon generation (all sizes)', 200),
      flatOneTime('Social media profile picture versions', 200),
      flatOneTime('Brand guidelines one-pager (PDF)', 300),
      freeItem('Source files — AI/SVG/PNG — delivered via drive'),
    ],
    deliverDays: 3, stage: 'design',
  },

  {
    id: 'brochure-pdf',
    label: 'Brochure / Catalog PDF — WhatsApp Optimized',
    icon: 'FileText',
    section: 'build',
    items: [
      flatOneTime('Design — 4 page A4 / digital layout', 600),
      flatOneTime('Content writing — services + about + contact', 500),
      oneTimeItem('Stock / client photo sourcing (8 images)', 200, 50),
      flatOneTime('PDF compression for WhatsApp sharing', 200),
      flatOneTime('Mobile + print optimized export', 200),
    ],
    deliverDays: 1, stage: 'design',
  },

  {
    id: 'ordering-page',
    label: 'Online Ordering Page — WhatsApp Form',
    icon: 'ShoppingCart',
    section: 'automate',
    items: [
      flatOneTime('Order form design (items, quantity, note)', 300),
      flatOneTime('Form fields — name, phone, address, special request', 200),
      flatOneTime('WhatsApp submission integration', 300),
      flatOneTime('Order confirmation auto-reply template', 200),
      flatOneTime('Deploy + testing', 200),
    ],
    deliverDays: 1, stage: 'build',
  },

  // --- SEO & local ranking (continued) ---

  // --- Marketing & campaigns ---

  {
    id: 'email-marketing-setup',
    label: 'Email Marketing Setup — Templates + Automation + List Import',
    icon: 'Mail',
    section: 'automate',
    items: [
      oneTimeItem('Platform setup (Brevo/Mailchimp/MailerLite)', 1300, 30),
      flatOneTime('Branded newsletter template (HTML)', 600),
      flatOneTime('Subscriber list import + segmentation', 300),
      flatOneTime('Welcome email automation flow', 400),
      flatOneTime('Signup form embed on website', 200),
      flatOneTime('GDPR / opt-in compliance setup', 200),
      freeItem('Test send + deliverability check'),
    ],
    deliverDays: 0.5, stage: 'build',
  },

  {
    id: 'email-marketing',
    label: 'Email Marketing Management — Campaigns + Optimization + Reporting',
    icon: 'Mail',
    section: 'automate',
    items: [
      flatMonthly('Monthly newsletter campaigns (2–4 sends)', 600),
      flatMonthly('Content + copywriting for campaigns', 500),
      flatMonthly('Template updates + seasonal designs', 400),
      flatMonthly('A/B subject line testing + optimization', 300),
      flatMonthly('List cleaning + inactive subscriber pruning', 200),
      flatMonthly('Re-engagement campaign (quarterly)', 250),
      flatMonthly('Performance analytics report', 300),
    ],
  },

  {
    id: 'sms-marketing',
    label: 'SMS Marketing — Offers, Reminders & Alerts',
    icon: 'Send',
    section: 'automate',
    items: [
      freeItem('SMS platform setup (Twilio/Textlocal/Exotel)'),
      flatOneTime('DND scrub + TRAI compliance registration', 300),
      flatOneTime('Message templates — appointment, offer, reminder', 400),
      flatOneTime('DLT template registration (India)', 300),
      flatOneTime('Campaign scheduling + automation', 200),
      flatOneTime('Opt-out / STOP handling in templates', 100),
      monthlyItem('SMS sending costs (~500 msgs/month)', 250, 30, 2500),
      flatMonthly('Monthly delivery + conversion report', 200),
    ],
    clientCostNote: 'SMS credits paid directly to provider (~₹0.25–0.50/msg). Estimated 500 msgs = ~₹200/mo.',
  },

  {
    id: 'blog-content',
    label: 'Blog / Content Writing — 2–4 Posts/Month',
    icon: 'PenLine',
    section: 'stay-active',
    items: [
      flatMonthly('Topic research + keyword selection', 300),
      flatMonthly('Writing — 600–800 words per post', 500),
      monthlyItem('Featured image sourcing + optimization', 200, 50),
      flatMonthly('On-page SEO — headings, meta, internal links', 300),
      flatMonthly('Publishing + formatting on website', 200),
      flatMonthly('Monthly content performance report', 200),
    ],
    deliverDays: 0.25, parallel: true,
  },

  {
    id: 'qr-suite',
    label: 'QR Suite — Menu + UPI Payment + WhatsApp',
    icon: 'QrCode',
    section: 'automate',
    items: [
      freeItem('QR code generation (mobile-responsive)'),
      flatOneTime('Menu landing page design (responsive)', 500),
      freeItem('UPI payment link / QR integration'),
      freeItem('WhatsApp click-to-chat QR link'),
      flatOneTime('Printable A4 PDF with all 3 QR codes', 400),
      flatOneTime('Sticker / table stand design (print-ready)', 300),
    ],
    deliverDays: 1, stage: 'design',
  },

  {
    id: 'festive-campaign',
    label: 'Festive Campaign Pack — Diwali / Holi / New Year',
    icon: 'Sparkles',
    section: 'grow',
    items: [
      flatOneTime('Campaign theme design + branding', 600),
      flatOneTime('Social media posts (5) — Instagram + Facebook', 600),
      flatOneTime('Email blast template + send', 400),
      flatOneTime('SMS broadcast template + send', 300),
      flatOneTime('WhatsApp Business broadcast template', 300),
      flatOneTime('Festive offer / discount creative (2 variants)', 300),
    ],
    deliverDays: 2, stage: 'design', clientCostNote: 'SMS credits billed separately (~₹0.25–0.50/msg per broadcast)',
  },

  {
    id: 'appointment-booking',
    label: 'Online Appointment Booking Page',
    icon: 'Calendar',
    section: 'automate',
    items: [
      flatOneTime('Booking page design (branded, responsive)', 500),
      flatOneTime('Time slot + availability configuration', 300),
      flatOneTime('Service / treatment selection menu', 300),
      flatOneTime('WhatsApp + email booking confirmation', 300),
      freeItem('Google Calendar auto-sync'),
      flatOneTime('Admin dashboard walkthrough + guide', 200),
      flatOneTime('Mobile + desktop testing', 100),
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
      flatOneTime('FAQ knowledge base setup (50+ Q&A)', 500),
      flatOneTime('Business context + tone prompt engineering', 300),
      flatOneTime('24/7 auto-reply flow — greeting + FAQ + handoff', 400),
      flatOneTime('Fallback to human trigger setup', 200),
      flatMonthly('Monthly conversation review + prompt tuning', 300),
    ],
    deliverDays: 1.5, parallel: true,
  },

  {
    id: 'ai-content',
    label: 'AI Content Writer — Blogs + Social Captions + Emails',
    icon: 'Wand2',
    section: 'stay-active',
    items: [
      monthlyItem('OpenAI API credits + usage (~20K tokens/mo)', 200, 30, 2000),
      flatOneTime('Brand voice + style guide prompt setup', 400),
      flatMonthly('Blog post generation + editing (4/month)', 500),
      flatMonthly('Social media caption generation (8/month)', 400),
      flatMonthly('Email newsletter draft generation (2/month)', 300),
      flatMonthly('SEO keyword + meta description generation', 200),
      flatMonthly('Human review + polishing before publish', 300),
    ],
    deliverDays: 0.25, parallel: true,
  },

  {
    id: 'ai-review-manager',
    label: 'AI Review Manager — Auto-Replies + Monthly Summary',
    icon: 'Star',
    section: 'get-found',
    items: [
      monthlyItem('OpenAI API credits + usage (~5K tokens/mo)', 100, 30, 1000),
      freeItem('Review monitoring — Google + Facebook + Justdial'),
      flatOneTime('Auto-response prompt engineering (per platform)', 500),
      flatMonthly('Positive review — thank you + upsell reply', 200),
      flatMonthly('Negative review — empathetic + resolution reply', 300),
      flatMonthly('Sentiment analysis + escalation rules', 300),
      flatMonthly('Monthly review sentiment report', 300),
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
      flatOneTime('Qualification script — budget, timeline, requirements', 500),
      flatOneTime('Intent detection prompt setup', 300),
      flatOneTime('Lead scoring rules — hot/warm/cold', 300),
      flatOneTime('Hot lead → instant WhatsApp notification to you', 200),
      flatMonthly('Monthly conversion + lead quality report', 300),
    ],
    deliverDays: 1, parallel: true,
  },

  {
    id: 'ai-product-photos',
    label: 'AI Product Photos — Studio Quality Without Photoshoot',
    icon: 'Image',
    section: 'stay-active',
    items: [
      flatOneTime('Product photo guidelines — angles, lighting instructions', 200),
      flatOneTime('Midjourney / DALL-E prompt engineering per product', 300),
      flatOneTime('Background generation + product placement (10 photos)', 500),
      oneTimeItem('AI generation credits (Midjourney/DALL-E)', 1500, 30),
      flatOneTime('Manual edits + color correction + resize', 300),
      flatOneTime('Web + social media optimized delivery', 200),
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
      flatOneTime('Discovery + scope document', 2000),
      flatOneTime('Screen designs + clickable mockups', 2000),
      flatOneTime('Customer-facing screens & dashboards', 4000),
      flatOneTime('Business rules & data processing', 6000),
      flatOneTime('Data storage & organization', 2000),
      flatOneTime('Staff login & role-based access', 2000),
      flatOneTime('Admin panel — manage records, filter, export', 4000),
      flatOneTime('Charts, graphs & KPI dashboards', 2000),
      flatOneTime('Kanban board — drag & drop pipeline', 1500),
      flatOneTime('Search, sort & advanced filters', 800),
      flatOneTime('Email & in-app notifications + reminders', 1200),
      flatOneTime('Automated workflows & triggers', 1500),
      flatOneTime('Activity log — who did what, when', 800),
      flatOneTime('Import existing data (Excel / CSV)', 800),
      flatOneTime('Customer portal — clients track their status', 2000),
      flatOneTime('Integrations — payments, email, SMS, WhatsApp', 2000),
      flatOneTime('File uploads — images, PDFs, documents', 1200),
      flatOneTime('Live updates — chat, notifications, statuses', 2000),
      flatOneTime('Reports & invoices (PDF)', 1200),
      flatOneTime('Testing before launch', 2000),
      flatOneTime('Deployment — staging + live setup', 1200),
      flatOneTime('User guide & admin manual', 800),
      flatOneTime('30-day support after launch', 1200),
      flatOneTime('Team training & handover session', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Infrastructure costs (hosting, database, domain) are billed separately by the client.',
  },

  {
    id: 'billing-invoicing',
    label: 'Billing & GST Invoicing',
    icon: 'Receipt',
    section: 'custom-software',
    items: [
      flatOneTime('GST invoices — CGST, SGST & IGST breakdown', 2000),
      flatOneTime('Customer & item management', 1500),
      flatOneTime('Payment tracking — paid, pending, overdue', 1000),
      flatOneTime('UPI / payment links on every invoice', 1000),
      flatOneTime('Recurring invoices for subscriptions', 1000),
      flatOneTime('Invoice email + WhatsApp share', 800),
      flatOneTime('Reports — revenue, outstanding, GST summary', 1000),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Payment gateway fees billed separately by Razorpay.',
  },

  {
    id: 'inventory',
    label: 'Inventory & Stock Management',
    icon: 'Boxes',
    section: 'custom-software',
    items: [
      flatOneTime('Product catalog — name, price, category', 1500),
      flatOneTime('Stock in / stock out tracking', 1200),
      flatOneTime('Low-stock alerts', 800),
      flatOneTime('Purchase orders', 1000),
      flatOneTime('Supplier management', 800),
      flatOneTime('Stock valuation report', 800),
      flatOneTime('Barcode / QR scanning', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'staff-attendance',
    label: 'Staff Attendance & Payroll',
    icon: 'Users',
    section: 'custom-software',
    items: [
      flatOneTime('Staff profiles', 800),
      flatOneTime('Clock-in / clock-out — web or QR', 1500),
      flatOneTime('Leave & holiday calendar', 1000),
      flatOneTime('Shift management', 1000),
      flatOneTime('Attendance reports — daily & monthly', 1000),
      flatOneTime('Salary calculation', 1000),
      flatOneTime('Payroll summary export (Excel)', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'loyalty-rewards',
    label: 'Loyalty & Rewards Program',
    icon: 'Gift',
    section: 'custom-software',
    items: [
      flatOneTime('Points on every visit / purchase', 1500),
      flatOneTime('Digital punch card — buy 5 get 1 free', 1000),
      flatOneTime('Referral rewards — friend signup bonus', 1000),
      flatOneTime('Member tiers — silver / gold / platinum', 800),
      flatOneTime('Reward redemption tracking', 800),
      flatOneTime('WhatsApp + email reward notifications', 800),
      flatOneTime('Loyalty analytics report', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'delivery-tracking',
    label: 'Delivery Tracking',
    icon: 'Truck',
    section: 'custom-software',
    items: [
      flatOneTime('Order status flow — placed → out → delivered', 1500),
      flatOneTime('Driver assignment', 1000),
      flatOneTime('Customer tracking link (live status)', 1000),
      flatOneTime('WhatsApp delivery updates', 800),
      flatOneTime('Delivery zones / pincode setup', 800),
      flatOneTime('Delivery analytics report', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'membership',
    label: 'Membership Management',
    icon: 'Award',
    section: 'custom-software',
    items: [
      flatOneTime('Membership plans — monthly / quarterly / annual', 1500),
      flatOneTime('Member signup & profile', 1000),
      flatOneTime('Renewal reminders', 1000),
      flatOneTime('Expiry alerts', 800),
      flatOneTime('Payment collection (UPI links)', 800),
      flatOneTime('Usage / attendance tracking', 1000),
      flatOneTime('Membership reports', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },
]

// ---------------------------------------------------------------------------
// Build the lookup map
// ---------------------------------------------------------------------------

const _serviceMap: Record<string, Service> = {}
for (const svc of SERVICES) {
  _serviceMap[svc.id] = svc
}

// Guard: every service must have matching marketing copy, so a missing
// service-detail page never ships silently.
for (const svc of SERVICES) {
  if (!SERVICE_CONTENT[svc.id]) {
    throw new Error(`Missing SERVICE_CONTENT for service "${svc.id}"`)
  }
}

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
