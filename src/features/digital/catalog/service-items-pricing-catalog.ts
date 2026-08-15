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
// Service item builders
// ---------------------------------------------------------------------------

function _item(
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

// one-time deliverable, fixed selling price (pure profit)
function _s(label: string, sell: number): ServiceItem {
  return _item(label, 0, 0, 0, 100, 0, 0, sell)
}

// one-time purchase with a real cost + margin
function _sc(label: string, cost: number, margin: number): ServiceItem {
  return _item(label, cost, 0, 0, margin, 0, 0)
}

// monthly deliverable, fixed selling price (pure profit)
function _m(label: string, sell: number): ServiceItem {
  return _item(label, 0, 0, 0, 0, 100, 0, undefined, sell)
}

// monthly recurring cost + margin, optional annual equivalent
function _mc(label: string, cost: number, margin: number, annualCost = 0): ServiceItem {
  return _item(label, 0, cost, annualCost, 0, margin, annualCost > 0 ? margin : 0)
}

// no charge, no cost
function _f(label: string): ServiceItem {
  return _item(label, 0, 0, 0, 0, 0, 0)
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
      _sc('Domain Registration', 800, 30),
      _sc('Domain Privacy Protection', 200, 30),
      _sc('SSL Certificate', 300, 40),
      _mc('Cloud Hosting', 300, 50, 3000),
      _mc('S3 / Asset Storage', 80, 30, 800),
      _s('CDN Setup (Cloudflare)', 2000),
      _s('DNS Configuration', 500),
      _s('Git Repository Setup', 300),
      _s('CI/CD Pipeline', 600),
      _s('Design — Figma mockups', 600),
      _s('Development — Next.js build', 1000),
      _s('Content writing (5 pgs)', 800),
      _sc('Image sourcing (10 imgs)', 300, 50),
      _s('Mobile responsive testing', 300),
      _s('Cross-browser testing', 300),
      _s('SEO meta tags + sitemap', 400),
      _f('GA4 property setup'),
      _f('Google Search Console setup'),
      _s('Lighthouse perf optimization', 400),
      _s('Security headers hardening', 400),
      _mc('Daily backups', 100, 30, 1000),
      _m('Uptime monitoring', 400),
      _s('Privacy policy template', 200),
    ],
    deliverDays: 1, stage: 'build',
  },

  {
    id: 'whatsapp',
    label: 'WhatsApp Chat Button',
    icon: 'MessageSquare',
    section: 'build',
    items: [
      _f('WhatsApp Business Account'),
      _s('Chat bubble + pre-chat name/phone form', 300),
      _s('Click-to-chat deep link + offline message', 250),
      _mc('WA API conversation costs', 50, 40, 500),
      _s('Chat click tracking + analytics', 100),
      _s('Mobile + desktop testing', 150),
    ],
    deliverDays: 0, stage: 'build',
  },

  {
    id: 'gbp',
    label: 'Google Business Profile — Setup & Verify',
    icon: 'MapPin',
    section: 'build',
    items: [
      _s('Business verification (postcard handling)', 300),
      _s('Business info + hours setup', 250),
      _s('Category + service area setup', 300),
      _s('Photo upload + optimization', 300),
      _s('Q&A section pre-population', 300),
      _s('Review response templates', 200),
      _s('Product/menu section setup', 300),
    ],
    deliverDays: 0.5, parallel: true, stage: 'setup',
  },

  {
    id: 'analytics',
    label: 'Visit Analytics',
    icon: 'BarChart3',
    section: 'build',
    items: [
      _f('GA4 property + data stream'),
      _f('GTM container + triggers'),
      _s('Event tracking setup', 300),
      _s('Conversion goal setup', 250),
      _s('Custom Looker Studio dashboard', 400),
      _f('Search Console + sitemap'),
      _s('UTM parameter standardization', 200),
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
      _s('Content writing (500 words)', 200),
      _s('Design layout in Figma', 150),
      _s('Development + responsive QA', 150),
      _sc('Image sourcing (2 images)', 50, 50),
      _s('SEO meta tags for page', 100),
    ],
    unitLabel: 'per page', deliverDays: 0.25, stage: 'build',
  },

  {
    id: 'launch-photos',
    label: 'Additional photos',
    icon: 'Image',
    section: 'build',
    items: [
      _sc('Stock photo license', 80, 40),
      _s('Image optimization (WebP/AVIF)', 200),
      _s('Alt text + SEO metadata', 100),
    ],
    deliverDays: 0.25, stage: 'build',
  },

  {
    id: 'launch-domain',
    label: 'Domain setup',
    icon: 'Link',
    section: 'build',
    items: [
      _s('DNS record configuration', 300),
      _f('Email forwarding setup'),
      _s('Subdomain configuration', 200),
      _s('SSL auto-renewal verification', 200),
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
      _m('Weekly GBP posts (4/mo) — offers, updates, photos', 800),
      _m('Photo optimization + geo-tagging', 300),
      _m('Offer / promotion post design (Canva)', 300),
      _m('Review generation campaign + reply drafting', 400),
      _m('Q&A section monitoring + replies', 200),
      _m('Competitor GBP analysis (top 3)', 300),
      _mc('Google Maps ranking tracker', 200, 40, 2000),
      _mc('Local Falcon rank checker', 150, 30, 1500),
      _m('Monthly performance report', 300),
    ],
    deliverDays: 0.5, stage: 'setup',
  },

  {
    id: 'local-seo',
    label: 'Local SEO — Google Maps Ranking',
    icon: 'Search',
    section: 'get-found',
    items: [
      _m('Local keyword research (30 kw)', 600),
      _m('Citation building (20+ dirs)', 500),
      _m('NAP consistency audit', 300),
      _m('Local backlink outreach (5/mo)', 300),
      _m('Location page schema markup', 250),
      _mc('BrightLocal / Whitespark tool', 300, 30, 3000),
      _m('Monthly ranking report', 300),
    ],
    stage: 'setup',
  },

  {
    id: 'whatsapp-book',
    label: 'WhatsApp Business — Auto-reply & Booking',
    icon: 'MessageSquare',
    section: 'automate',
    items: [
      _mc('WATI / Interakt platform', 500, 40, 5000),
      _s('Auto-reply greeting flow', 400),
      _s('Quick replies menu (5 options)', 200),
      _s('Away message automation', 200),
      _s('Labels + chat organization', 200),
      _s('Catalog setup in WhatsApp', 300),
      _s('Booking flow setup', 400),
      _mc('API conversation costs', 300, 30, 3000),
    ],
    deliverDays: 0.5, stage: 'setup',
  },

  {
    id: 'reviews',
    label: 'Review Generation & Management',
    icon: 'Star',
    section: 'get-found',
    items: [
      _f('Review link generator + Google redirect'),
      _mc('SMS review requests (Twilio)', 150, 40, 1500),
      _m('WhatsApp + email review request automation', 300),
      _f('Review monitoring (alerts)'),
      _m('5-star thank-you + review showcase on website', 300),
      _m('Negative feedback private redirect', 300),
      _m('Monthly review performance dashboard', 200),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'social',
    label: 'Social Media — 8 Posts/month',
    icon: 'Share2',
    section: 'stay-active',
    items: [
      _m('Content calendar planning', 300),
      _m('Copywriting (8 posts)', 400),
      _m('Graphic design (8 creatives)', 600),
      _mc('Stock imagery (4 imgs/mo)', 200, 40, 2000),
      _m('Hashtag research', 200),
      _m('Engagement monitoring + replies', 200),
      _m('Monthly social report', 300),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'seo-report',
    label: 'Monthly SEO Health Report',
    icon: 'BarChart3',
    section: 'get-found',
    items: [
      _f('Google Search Console data pull'),
      _m('Keyword position tracking', 200),
      _mc('Technical SEO crawl (Sitebulb)', 200, 30, 2000),
      _f('Page speed analysis (Lighthouse)'),
      _m('Broken link check', 100),
      _m('Competitor comparison (top 3)', 300),
      _m('Actionable recommendations', 200),
      _m('PDF report generation (branded)', 200),
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
      _f('Google Ads account + conversion tracking'),
      _s('Search Ads — keyword research + text ad copy', 600),
      _s('Maps / Local Services Ads — listing + geo-setup', 500),
      _s('Performance Max — image assets + headlines', 500),
      _s('YouTube Ads — bumper + discovery ad setup', 400),
      _s('Landing page optimization for ads', 300),
      _s('Ad extensions — call, location, sitelink', 300),
      _s('Budget strategy + bid management setup', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹2K–10K/mo recommended)',
  },

  {
    id: 'meta-ads-setup',
    label: 'Meta Ads Setup — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      _f('Meta Business Suite + Commerce Manager setup'),
      _f('FB Pixel + CAPI event setup (shared)'),
      _s('Facebook Feed + Stories — image ads + copy', 600),
      _s('Instagram Feed + Stories + Reels — vertical ads', 600),
      _mc('WhatsApp — WATI/Interakt platform subscription', 500, 40, 5000),
      _s('WhatsApp — Business API message templates', 400),
      _f('Messenger — click-to-Messenger flow setup'),
      _s('Audience research — custom + lookalike', 500),
      _s('Campaign structure — prospecting + retargeting', 300),
      _s('Budget strategy + bid setup', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Meta (~₹3K–15K/mo recommended)',
  },

  {
    id: 'growth-city',
    label: 'Cover another city',
    icon: 'MapPin',
    section: 'grow',
    items: [
      _s('City landing page (design+dev)', 600),
      _s('Local citations (15 directories)', 400),
      _s('City-specific keyword research', 300),
      _s('GBP location setup', 300),
      _s('City schema markup', 200),
      _mc('BrightLocal citation tool', 100, 30, 1000),
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
      _f('Slack/WhatsApp priority channel'),
      _m('Monthly 1-hr strategy call', 500),
      _m('Strategy deck + KPI report (10 slides)', 500),
      _m('Quarterly business review deck', 400),
      _f('Notion/Linear task management'),
      _m('4-hr response SLA (biz hrs)', 300),
      _m('Weekly async update + action items', 300),
    ],
  },

  {
    id: 'unlimited-updates',
    label: 'Content & Page Updates — Unlimited',
    icon: 'RefreshCw',
    section: 'care',
    items: [
      _m('Content update labor (~10hrs/mo)', 1000),
      _m('Design tweaks in Figma', 400),
      _m('Development + deploy', 400),
      _m('QA + regression testing', 300),
      _m('Image replacement + optimization', 200),
    ],
  },

  {
    id: 'social-reels',
    label: 'Social Media — Reels & Stories',
    icon: 'Video',
    section: 'stay-active',
    items: [
      _m('Content ideation + storyboards', 600),
      _mc('Stock footage (Artgrid/Storyblocks)', 300, 40, 3000),
      _mc('Video editing (CapCut Pro)', 150, 40, 1500),
      _m('Trending audio research', 200),
      _m('Motion graphics + text overlays', 400),
      _m('Caption writing + hashtag pack', 200),
      _m('Instagram Stories design (8/mo)', 500),
      _m('Posting schedule + tracking', 200),
    ],
  },

  {
    id: 'google-ads-management',
    label: 'Google Ads Management — Search, Maps & Video',
    icon: 'Search',
    section: 'grow',
    items: [
      _m('Search Ads — weekly bid + keyword optimization', 500),
      _m('Maps Ads — geo-performance tuning', 400),
      _m('Performance Max — asset refresh + optimization', 400),
      _m('YouTube Ads — video performance review', 300),
      _m('A/B testing (2 variants/month)', 300),
      _m('Search term mining + negative keyword adds', 300),
      _m('Remarketing audience setup + refresh', 300),
      _m('Performance dashboard (Looker Studio)', 400),
      _m('Monthly ads performance report', 300),
    ],
    deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹5K–25K/mo recommended)',
  },

  {
    id: 'meta-ads-management',
    label: 'Meta Ads Management — Facebook + Instagram + WhatsApp + Messenger',
    icon: 'Share2',
    section: 'grow',
    items: [
      _m('Facebook — weekly bid + audience optimization', 400),
      _m('Instagram — creative refresh + Reels ad optimization', 400),
      _mc('WhatsApp — WATI/Interakt platform', 500, 40, 5000),
      _mc('WhatsApp — marketing conversation costs (~50/mo)', 250, 30, 2500),
      _m('WhatsApp — template updates + flow optimization', 300),
      _m('Messenger — auto-reply flow updates', 200),
      _m('A/B testing (2 variants/month)', 300),
      _m('Creative refresh (4 new ads/month)', 400),
      _m('Audience refinement + exclusions', 300),
      _m('Remarketing campaign management', 300),
      _m('Advantage+ / dynamic creative optimization', 300),
      _m('Competitor ad analysis', 300),
      _m('Monthly performance report', 300),
    ],
    clientCostNote: 'Ad budget paid directly to Meta (~₹10K–50K/mo recommended)',
  },

  {
    id: 'competitor',
    label: 'Competitor & Market Analysis',
    icon: 'BarChart3',
    section: 'grow',
    items: [
      _m('Competitor website audit (3)', 400),
      _f('SEMrush domain comparison'),
      _m('SWOT analysis document', 300),
      _m('Market positioning recommendations', 300),
      _m('Gap analysis — services you lack', 300),
      _m('PDF report with exec summary', 300),
      _mc('SimilarWeb traffic estimation', 100, 30, 1000),
    ],
  },

  // --- Priority & multi-location ---

  {
    id: 'scale-priority',
    label: 'Same-day priority support',
    icon: 'Zap',
    section: 'care',
    items: [
      _f('Priority queue in support system'),
      _m('2-hr response SLA (biz hrs)', 500),
      _mc('Emergency hotline routing', 100, 40, 1000),
    ],
  },

  {
    id: 'scale-multi',
    label: 'Multi-location',
    icon: 'Building',
    section: 'get-found',
    items: [
      _s('Additional GBP setup', 600),
      _s('Location landing page', 500),
      _s('Local citations for new loc', 400),
      _s('Location schema + geo sitemap', 300),
      _mc('BrightLocal citation tool', 150, 30, 1500),
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
      _s('Zoho Mail account setup + domain verification', 500),
      _s('DNS MX record configuration', 200),
      _s('SPF + DKIM + DMARC email authentication', 200),
      _s('Email signature design + setup', 200),
      _s('Forwarding rules + aliases', 150),
      _s('IMAP/SMTP guide for mobile + desktop', 150),
    ],
    deliverDays: 0.25, parallel: true, stage: 'setup',
  },

  {
    id: 'staff-training',
    label: 'Staff Handover Training — 1–2 Hour Session',
    icon: 'Users',
    section: 'care',
    items: [
      _s('WhatsApp Business reply guide + templates', 300),
      _s('GBP posting guide (offers, photos, replies)', 300),
      _s('Basic website CMS walkthrough', 300),
      _s('SMS / email campaign dashboard overview', 200),
      _s('Live session delivery (1–2 hrs)', 500),
      _s('Quick reference cheat sheet (PDF)', 200),
    ],
    deliverDays: 1,
  },

  {
    id: 'branding-identity',
    label: 'Logo & Branding — Identity + Guidelines',
    icon: 'Palette',
    section: 'build',
    items: [
      _s('Logo design — 3 concepts + 2 revisions', 600),
      _s('Color palette — primary + secondary + accent', 200),
      _f('Typography selection — heading + body fonts'),
      _s('Logo variations — light/dark BG + icon-only', 300),
      _s('Favicon + app icon generation (all sizes)', 200),
      _s('Social media profile picture versions', 200),
      _s('Brand guidelines one-pager (PDF)', 300),
      _f('Source files — AI/SVG/PNG — delivered via drive'),
    ],
    deliverDays: 3, stage: 'design',
  },

  {
    id: 'brochure-pdf',
    label: 'Brochure / Catalog PDF — WhatsApp Optimized',
    icon: 'FileText',
    section: 'build',
    items: [
      _s('Design — 4 page A4 / digital layout', 600),
      _s('Content writing — services + about + contact', 500),
      _sc('Stock / client photo sourcing (8 images)', 200, 50),
      _s('PDF compression for WhatsApp sharing', 200),
      _s('Mobile + print optimized export', 200),
    ],
    deliverDays: 1, stage: 'design',
  },

  {
    id: 'ordering-page',
    label: 'Online Ordering Page — WhatsApp Form',
    icon: 'ShoppingCart',
    section: 'automate',
    items: [
      _s('Order form design (items, quantity, note)', 300),
      _s('Form fields — name, phone, address, special request', 200),
      _s('WhatsApp submission integration', 300),
      _s('Order confirmation auto-reply template', 200),
      _s('Deploy + testing', 200),
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
      _sc('Platform setup (Brevo/Mailchimp/MailerLite)', 1300, 30),
      _s('Branded newsletter template (HTML)', 600),
      _s('Subscriber list import + segmentation', 300),
      _s('Welcome email automation flow', 400),
      _s('Signup form embed on website', 200),
      _s('GDPR / opt-in compliance setup', 200),
      _f('Test send + deliverability check'),
    ],
    deliverDays: 0.5, stage: 'build',
  },

  {
    id: 'email-marketing',
    label: 'Email Marketing Management — Campaigns + Optimization + Reporting',
    icon: 'Mail',
    section: 'automate',
    items: [
      _m('Monthly newsletter campaigns (2–4 sends)', 600),
      _m('Content + copywriting for campaigns', 500),
      _m('Template updates + seasonal designs', 400),
      _m('A/B subject line testing + optimization', 300),
      _m('List cleaning + inactive subscriber pruning', 200),
      _m('Re-engagement campaign (quarterly)', 250),
      _m('Performance analytics report', 300),
    ],
  },

  {
    id: 'sms-marketing',
    label: 'SMS Marketing — Offers, Reminders & Alerts',
    icon: 'Send',
    section: 'automate',
    items: [
      _f('SMS platform setup (Twilio/Textlocal/Exotel)'),
      _s('DND scrub + TRAI compliance registration', 300),
      _s('Message templates — appointment, offer, reminder', 400),
      _s('DLT template registration (India)', 300),
      _s('Campaign scheduling + automation', 200),
      _s('Opt-out / STOP handling in templates', 100),
      _mc('SMS sending costs (~500 msgs/month)', 250, 30, 2500),
      _m('Monthly delivery + conversion report', 200),
    ],
    clientCostNote: 'SMS credits paid directly to provider (~₹0.25–0.50/msg). Estimated 500 msgs = ~₹200/mo.',
  },

  {
    id: 'blog-content',
    label: 'Blog / Content Writing — 2–4 Posts/Month',
    icon: 'PenLine',
    section: 'stay-active',
    items: [
      _m('Topic research + keyword selection', 300),
      _m('Writing — 600–800 words per post', 500),
      _mc('Featured image sourcing + optimization', 200, 50),
      _m('On-page SEO — headings, meta, internal links', 300),
      _m('Publishing + formatting on website', 200),
      _m('Monthly content performance report', 200),
    ],
    deliverDays: 0.25, parallel: true,
  },

  {
    id: 'qr-suite',
    label: 'QR Suite — Menu + UPI Payment + WhatsApp',
    icon: 'QrCode',
    section: 'automate',
    items: [
      _f('QR code generation (mobile-responsive)'),
      _s('Menu landing page design (responsive)', 500),
      _f('UPI payment link / QR integration'),
      _f('WhatsApp click-to-chat QR link'),
      _s('Printable A4 PDF with all 3 QR codes', 400),
      _s('Sticker / table stand design (print-ready)', 300),
    ],
    deliverDays: 1, stage: 'design',
  },

  {
    id: 'festive-campaign',
    label: 'Festive Campaign Pack — Diwali / Holi / New Year',
    icon: 'Sparkles',
    section: 'grow',
    items: [
      _s('Campaign theme design + branding', 600),
      _s('Social media posts (5) — Instagram + Facebook', 600),
      _s('Email blast template + send', 400),
      _s('SMS broadcast template + send', 300),
      _s('WhatsApp Business broadcast template', 300),
      _s('Festive offer / discount creative (2 variants)', 300),
    ],
    deliverDays: 2, stage: 'design', clientCostNote: 'SMS credits billed separately (~₹0.25–0.50/msg per broadcast)',
  },

  {
    id: 'appointment-booking',
    label: 'Online Appointment Booking Page',
    icon: 'Calendar',
    section: 'automate',
    items: [
      _s('Booking page design (branded, responsive)', 500),
      _s('Time slot + availability configuration', 300),
      _s('Service / treatment selection menu', 300),
      _s('WhatsApp + email booking confirmation', 300),
      _f('Google Calendar auto-sync'),
      _s('Admin dashboard walkthrough + guide', 200),
      _s('Mobile + desktop testing', 100),
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
      _mc('WATI / Interakt AI bot subscription', 500, 40, 5000),
      _s('FAQ knowledge base setup (50+ Q&A)', 500),
      _s('Business context + tone prompt engineering', 300),
      _s('24/7 auto-reply flow — greeting + FAQ + handoff', 400),
      _s('Fallback to human trigger setup', 200),
      _m('Monthly conversation review + prompt tuning', 300),
    ],
    deliverDays: 1.5, parallel: true,
  },

  {
    id: 'ai-content',
    label: 'AI Content Writer — Blogs + Social Captions + Emails',
    icon: 'Wand2',
    section: 'stay-active',
    items: [
      _mc('OpenAI API credits + usage (~20K tokens/mo)', 200, 30, 2000),
      _s('Brand voice + style guide prompt setup', 400),
      _m('Blog post generation + editing (4/month)', 500),
      _m('Social media caption generation (8/month)', 400),
      _m('Email newsletter draft generation (2/month)', 300),
      _m('SEO keyword + meta description generation', 200),
      _m('Human review + polishing before publish', 300),
    ],
    deliverDays: 0.25, parallel: true,
  },

  {
    id: 'ai-review-manager',
    label: 'AI Review Manager — Auto-Replies + Monthly Summary',
    icon: 'Star',
    section: 'get-found',
    items: [
      _mc('OpenAI API credits + usage (~5K tokens/mo)', 100, 30, 1000),
      _f('Review monitoring — Google + Facebook + Justdial'),
      _s('Auto-response prompt engineering (per platform)', 500),
      _m('Positive review — thank you + upsell reply', 200),
      _m('Negative review — empathetic + resolution reply', 300),
      _m('Sentiment analysis + escalation rules', 300),
      _m('Monthly review sentiment report', 300),
    ],
    deliverDays: 0.5, parallel: true,
  },

  {
    id: 'ai-lead-qualifier',
    label: 'AI Lead Qualifier — Auto-Questions + Scoring on WhatsApp',
    icon: 'Filter',
    section: 'grow',
    items: [
      _mc('WATI / Interakt bot flow + OpenAI integration', 500, 40, 5000),
      _s('Qualification script — budget, timeline, requirements', 500),
      _s('Intent detection prompt setup', 300),
      _s('Lead scoring rules — hot/warm/cold', 300),
      _s('Hot lead → instant WhatsApp notification to you', 200),
      _m('Monthly conversion + lead quality report', 300),
    ],
    deliverDays: 1, parallel: true,
  },

  {
    id: 'ai-product-photos',
    label: 'AI Product Photos — Studio Quality Without Photoshoot',
    icon: 'Image',
    section: 'stay-active',
    items: [
      _s('Product photo guidelines — angles, lighting instructions', 200),
      _s('Midjourney / DALL-E prompt engineering per product', 300),
      _s('Background generation + product placement (10 photos)', 500),
      _sc('AI generation credits (Midjourney/DALL-E)', 1500, 30),
      _s('Manual edits + color correction + resize', 300),
      _s('Web + social media optimized delivery', 200),
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
      _s('Discovery + scope document', 2000),
      _s('Screen designs + clickable mockups', 2000),
      _s('Customer-facing screens & dashboards', 4000),
      _s('Business rules & data processing', 6000),
      _s('Data storage & organization', 2000),
      _s('Staff login & role-based access', 2000),
      _s('Admin panel — manage records, filter, export', 4000),
      _s('Charts, graphs & KPI dashboards', 2000),
      _s('Kanban board — drag & drop pipeline', 1500),
      _s('Search, sort & advanced filters', 800),
      _s('Email & in-app notifications + reminders', 1200),
      _s('Automated workflows & triggers', 1500),
      _s('Activity log — who did what, when', 800),
      _s('Import existing data (Excel / CSV)', 800),
      _s('Customer portal — clients track their status', 2000),
      _s('Integrations — payments, email, SMS, WhatsApp', 2000),
      _s('File uploads — images, PDFs, documents', 1200),
      _s('Live updates — chat, notifications, statuses', 2000),
      _s('Reports & invoices (PDF)', 1200),
      _s('Testing before launch', 2000),
      _s('Deployment — staging + live setup', 1200),
      _s('User guide & admin manual', 800),
      _s('30-day support after launch', 1200),
      _s('Team training & handover session', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Infrastructure costs (hosting, database, domain) are billed separately by the client.',
  },

  {
    id: 'billing-invoicing',
    label: 'Billing & GST Invoicing',
    icon: 'Receipt',
    section: 'custom-software',
    items: [
      _s('GST invoices — CGST, SGST & IGST breakdown', 2000),
      _s('Customer & item management', 1500),
      _s('Payment tracking — paid, pending, overdue', 1000),
      _s('UPI / payment links on every invoice', 1000),
      _s('Recurring invoices for subscriptions', 1000),
      _s('Invoice email + WhatsApp share', 800),
      _s('Reports — revenue, outstanding, GST summary', 1000),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope. Payment gateway fees billed separately by Razorpay.',
  },

  {
    id: 'inventory',
    label: 'Inventory & Stock Management',
    icon: 'Boxes',
    section: 'custom-software',
    items: [
      _s('Product catalog — name, price, category', 1500),
      _s('Stock in / stock out tracking', 1200),
      _s('Low-stock alerts', 800),
      _s('Purchase orders', 1000),
      _s('Supplier management', 800),
      _s('Stock valuation report', 800),
      _s('Barcode / QR scanning', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'staff-attendance',
    label: 'Staff Attendance & Payroll',
    icon: 'Users',
    section: 'custom-software',
    items: [
      _s('Staff profiles', 800),
      _s('Clock-in / clock-out — web or QR', 1500),
      _s('Leave & holiday calendar', 1000),
      _s('Shift management', 1000),
      _s('Attendance reports — daily & monthly', 1000),
      _s('Salary calculation', 1000),
      _s('Payroll summary export (Excel)', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'loyalty-rewards',
    label: 'Loyalty & Rewards Program',
    icon: 'Gift',
    section: 'custom-software',
    items: [
      _s('Points on every visit / purchase', 1500),
      _s('Digital punch card — buy 5 get 1 free', 1000),
      _s('Referral rewards — friend signup bonus', 1000),
      _s('Member tiers — silver / gold / platinum', 800),
      _s('Reward redemption tracking', 800),
      _s('WhatsApp + email reward notifications', 800),
      _s('Loyalty analytics report', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'delivery-tracking',
    label: 'Delivery Tracking',
    icon: 'Truck',
    section: 'custom-software',
    items: [
      _s('Order status flow — placed → out → delivered', 1500),
      _s('Driver assignment', 1000),
      _s('Customer tracking link (live status)', 1000),
      _s('WhatsApp delivery updates', 800),
      _s('Delivery zones / pincode setup', 800),
      _s('Delivery analytics report', 800),
    ],
    clientCostNote: 'All prices are estimates. Final quote depends on project scope.',
  },

  {
    id: 'membership',
    label: 'Membership Management',
    icon: 'Award',
    section: 'custom-software',
    items: [
      _s('Membership plans — monthly / quarterly / annual', 1500),
      _s('Member signup & profile', 1000),
      _s('Renewal reminders', 1000),
      _s('Expiry alerts', 800),
      _s('Payment collection (UPI links)', 800),
      _s('Usage / attendance tracking', 1000),
      _s('Membership reports', 800),
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
