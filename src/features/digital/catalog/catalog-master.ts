export type ServiceStage = 'design' | 'build' | 'setup'

export interface ServiceItem {
  label: string
  costPrice: { monthly: number; annual: number }
  profitMargin: { monthly: number; annual: number }
  sellingPrice?: { monthly: number; annual: number }
}

export interface ServiceAggregate {
  cost: { monthly: number; annual: number }
  selling: { monthly: number; annual: number }
  margin: { monthly: number; annual: number }
}

export interface CatalogService {
  id: string
  service: {
    label: string
    items: ServiceItem[]
    clientCostNote?: string
  }
  aggregate?: ServiceAggregate
  unitLabel?: string
  deliverDays?: number
  parallel?: boolean
  stage?: ServiceStage
}

export interface CatalogPlan {
  id: string
  name: string
  tagline: string
  timeline: string
  icon: string
  featured?: boolean
  inherited?: { label: string }
  services: CatalogService[]
  addOns: CatalogService[]
  ctaLabel: string
  timelineMode?: 'phased'
  foundationDays?: number
  expectations?: { label: string; note: string }[]
  minimumMonths?: number
}

export interface DigitalCatalog {
  version: string
  updatedAt: string
  currency: 'INR'
  disclaimer?: string
  sharedInfra: { category: string; label: string; monthlyCost: number; upgradePath?: string; upgradeCost?: number }[]
  plans: CatalogPlan[]
}

// ---------------------------------------------------------------------------
// Compute helpers
// ---------------------------------------------------------------------------

function selling(cost: number, margin: number): number {
  return Math.round(cost * (1 + margin / 100))
}

export function computeItemSelling(item: ServiceItem) {
  return {
    monthly: item.sellingPrice?.monthly ?? selling(item.costPrice.monthly, item.profitMargin.monthly),
    annual: item.sellingPrice?.annual ?? selling(item.costPrice.annual, item.profitMargin.annual),
  }
}

export function computeServiceAggregate(svc: CatalogService): ServiceAggregate {
  let costMonthly = 0
  let costAnnual = 0
  let sellMonthly = 0
  let sellAnnual = 0

  for (const item of svc.service.items) {
    const sell = computeItemSelling(item)
    costMonthly += item.costPrice.monthly
    costAnnual += item.costPrice.annual
    sellMonthly += sell.monthly
    sellAnnual += sell.annual
  }

  return {
    cost: { monthly: costMonthly, annual: costAnnual },
    selling: { monthly: sellMonthly, annual: sellAnnual },
    margin: {
      monthly: costMonthly > 0 ? Math.round((sellMonthly - costMonthly) / costMonthly * 100) : 0,
      annual: costAnnual > 0 ? Math.round((sellAnnual - costAnnual) / costAnnual * 100) : 0,
    },
  }
}

export function enrichCatalog(catalog: DigitalCatalog): DigitalCatalog {
  for (const plan of catalog.plans) {
    for (const svc of [...plan.services, ...plan.addOns]) {
      svc.aggregate = computeServiceAggregate(svc)
    }
  }
  return catalog
}

// ---------------------------------------------------------------------------
// Service builder
// ---------------------------------------------------------------------------

function _item(label: string, costM: number, costA: number, marginM: number, marginA: number, sellM?: number, sellA?: number): ServiceItem {
  const result: ServiceItem = {
    label,
    costPrice: { monthly: costM, annual: costA },
    profitMargin: { monthly: marginM, annual: marginA },
  }
  if (sellM !== undefined || sellA !== undefined) {
    result.sellingPrice = { monthly: sellM ?? 0, annual: sellA ?? 0 }
  }
  return result
}

type ServiceDef = {
  label: string
  items: ServiceItem[]
  unitLabel?: string
  deliverDays?: number
  parallel?: boolean
  stage?: ServiceStage
  clientCostNote?: string
}

function _def(label: string, items: ServiceItem[], opts?: Partial<Pick<ServiceDef, 'unitLabel' | 'deliverDays' | 'parallel' | 'stage' | 'clientCostNote'>>): ServiceDef {
  return { label, items, ...opts }
}

const _allServices: Record<string, ServiceDef> = {}

function _register(id: string, def: ServiceDef) {
  _allServices[id] = def
}

// ---------------------------------------------------------------------------
// Shared infrastructure
// ---------------------------------------------------------------------------

export const sharedInfra: DigitalCatalog['sharedInfra'] = [
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
// ---------------------------------------------------------------------------

// --- Launch plan services ---

_register('website', _def('Website — Up to 5 Pages', [
  _item('Domain Registration',           0, 800,  0, 30),
  _item('Domain Privacy Protection',     0, 200,  0, 30),
  _item('SSL Certificate',               0, 300,  0, 40),
  _item('Cloud Hosting',               300, 3000, 50, 50),
  _item('S3 / Asset Storage',           80, 800,  30, 30),
  _item('CDN Setup (Cloudflare)',        0, 0,    100, 100, 500, 2000),
  _item('DNS Configuration',             0, 0,    100, 100, 150, 500),
  _item('Git Repository Setup',          0, 0,    100, 100, 100, 300),
  _item('CI/CD Pipeline',                0, 0,    100, 100, 200, 600),
  _item('Design — Figma mockups',        0, 0,    100, 100, 200, 600),
  _item('Development — Next.js build',   0, 0,    100, 100, 300, 1000),
  _item('Content writing (5 pgs)',       0, 0,    100, 100, 250, 800),
  _item('Image sourcing (10 imgs)',      0, 300,  0, 50),
  _item('Mobile responsive testing',     0, 0,    100, 100, 100, 300),
  _item('Cross-browser testing',         0, 0,    100, 100, 100, 300),
  _item('SEO meta tags + sitemap',       0, 0,    100, 100, 100, 400),
  _item('GA4 property setup',            0, 0,    0,  0,   0,   0),
  _item('Google Search Console setup',   0, 0,    0,  0,   0,   0),
  _item('Lighthouse perf optimization',  0, 0,    100, 100, 100, 400),
  _item('Security headers hardening',    0, 0,    100, 100, 100, 400),
  _item('Daily backups',               100, 1000,  30, 30),
  _item('Uptime monitoring',             0, 0,    100, 100, 100, 400),
  _item('Privacy policy template',       0, 0,    100, 100, 50,  200),
], { deliverDays: 1, stage: 'build' }))

_register('whatsapp', _def('WhatsApp Chat Button', [
  _item('WhatsApp Business Account',    0, 0,    0,  0,   0,   0),
  _item('Chat widget embed',            0, 0,    100, 100, 50,  200),
  _item('Click-to-chat deep link',      0, 0,    100, 100, 50,  200),
  _item('WA API conversation costs',   50, 500,  40, 40),
  _item('Responsive testing',           0, 0,    100, 100, 50,  150),
], { deliverDays: 0, stage: 'build' }))

_register('maps', _def('Google Maps Business Listing', [
  _item('Google Maps Platform',            0, 0,    0,  0,   0,   0),
  _item('Business profile verification',   0, 0,    100, 100, 100, 300),
  _item('Business info setup',             0, 0,    100, 100, 100, 200),
  _item('Category optimization',           0, 0,    100, 100, 100, 200),
  _item('Photo upload + optimization',     0, 0,    100, 100, 100, 300),
  _item('Service area geo-config',         0, 0,    100, 100, 100, 300),
], { deliverDays: 0.5, stage: 'setup' }))

_register('gbp', _def('Google Business Profile — Setup & Verify', [
  _item('Postcard verification handling', 0, 0,    100, 100, 100, 300),
  _item('Business hours setup',           0, 0,    100, 100, 50,  200),
  _item('Q&A section pre-population',     0, 0,    100, 100, 100, 300),
  _item('Review response templates',      0, 0,    100, 100, 100, 200),
  _item('Product/menu section setup',     0, 0,    100, 100, 100, 300),
], { deliverDays: 0.5, parallel: true, stage: 'setup' }))

_register('analytics', _def('Visit Analytics', [
  _item('GA4 property + data stream',       0, 0,    0,  0,   0,   0),
  _item('GTM container + triggers',         0, 0,    0,  0,   0,   0),
  _item('Event tracking setup',             0, 0,    100, 100, 100, 300),
  _item('Conversion goal setup',            0, 0,    100, 100, 100, 250),
  _item('Custom Looker Studio dashboard',   0, 0,    100, 100, 150, 400),
  _item('Search Console + sitemap',         0, 0,    0,  0,   0,   0),
  _item('UTM parameter standardization',    0, 0,    100, 100, 100, 200),
], { deliverDays: 0.5, parallel: true, stage: 'setup' }))

// --- Launch plan add-ons ---

_register('launch-pages', _def('Extra pages', [
  _item('Content writing (500 words)',    0, 0,    100, 100, 60,  200),
  _item('Design layout in Figma',         0, 0,    100, 100, 40,  150),
  _item('Development + responsive QA',    0, 0,    100, 100, 40,  150),
  _item('Image sourcing (2 images)',      0, 50,   0,  50),
  _item('SEO meta tags for page',         0, 0,    100, 100, 40,  100),
], { unitLabel: 'per page', deliverDays: 0.25, stage: 'build' }))

_register('launch-photos', _def('Additional photos', [
  _item('Stock photo license',             0, 80,   0,  40),
  _item('Image optimization (WebP/AVIF)',   0, 0,    100, 100, 50,  200),
  _item('Alt text + SEO metadata',         0, 0,    100, 100, 50,  100),
], { deliverDays: 0.25, stage: 'build' }))

_register('launch-domain', _def('Domain setup', [
  _item('DNS record configuration',       0, 0,    100, 100, 100, 300),
  _item('Email forwarding setup',         0, 0,    0,  0,   0,   0),
  _item('Subdomain configuration',        0, 0,    100, 100, 100, 200),
  _item('SSL auto-renewal verification',  0, 0,    100, 100, 100, 200),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

// --- Growth plan services ---

_register('gbp-optimise', _def('Google Business Profile — Optimize & Rank', [
  _item('Weekly GBP posts (4/mo)',           0, 0,    100, 100, 200, 800),
  _item('Photo optimization + geo-tagging',   0, 0,    100, 100, 100, 300),
  _item('Review generation campaign',         0, 0,    100, 100, 100, 400),
  _item('Competitor GBP analysis (top 3)',    0, 0,    100, 100, 100, 300),
  _item('Category optimization',              0, 0,    100, 100, 50,  200),
  _item('Google Maps ranking tracker',      200, 2000, 40, 40),
  _item('Local Falcon rank checker',        150, 1500, 30, 30),
  _item('Monthly performance report',         0, 0,    100, 100, 50,  200),
], { deliverDays: 0.5, stage: 'setup' }))

_register('local-seo', _def('Local SEO — Google Maps Ranking', [
  _item('Local keyword research (30 kw)',   0, 0,    100, 100, 200, 600),
  _item('Citation building (20+ dirs)',     0, 0,    100, 100, 150, 500),
  _item('NAP consistency audit',            0, 0,    100, 100, 100, 300),
  _item('Local backlink outreach (5/mo)',   0, 0,    100, 100, 100, 300),
  _item('Location page schema markup',      0, 0,    100, 100, 75,  250),
  _item('BrightLocal / Whitespark tool',  300, 3000, 30, 30),
  _item('Monthly ranking report',           0, 0,    100, 100, 100, 300),
], { stage: 'setup' }))

_register('whatsapp-book', _def('WhatsApp Business — Auto-reply & Booking', [
  _item('WATI / Interakt platform',        500, 5000, 40, 40),
  _item('Auto-reply greeting flow',          0, 0,    100, 100, 100, 400),
  _item('Quick replies menu (5 options)',    0, 0,    100, 100, 50,  200),
  _item('Away message automation',           0, 0,    100, 100, 50,  200),
  _item('Labels + chat organization',        0, 0,    100, 100, 50,  200),
  _item('Catalog setup in WhatsApp',         0, 0,    100, 100, 100, 300),
  _item('Booking flow setup',                0, 0,    100, 100, 100, 400),
  _item('API conversation costs',           300, 3000, 30, 30),
], { deliverDays: 0.5, stage: 'setup' }))

_register('reviews', _def('Review Generation & Management', [
  _item('Review link generator',             0, 0,    0,  0,   0,   0),
  _item('SMS review requests (Twilio)',    150, 1500, 40, 40),
  _item('Email review template + auto',      0, 0,    100, 100, 50,  200),
  _item('Review monitoring (alerts)',        0, 0,    0,  0,   0,   0),
  _item('Positive review showcase',          0, 0,    100, 100, 50,  200),
  _item('Negative review response tmpl',     0, 0,    100, 100, 50,  200),
  _item('Monthly review report',             0, 0,    100, 100, 50,  200),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

_register('social', _def('Social Media — 8 Posts/month', [
  _item('Content calendar planning',         0, 0,    100, 100, 100, 300),
  _item('Copywriting (8 posts)',             0, 0,    100, 100, 100, 400),
  _item('Graphic design (8 creatives)',      0, 0,    100, 100, 150, 600),
  _item('Stock imagery (4 imgs/mo)',       200, 2000, 40, 40),
  _item('Hashtag research',                  0, 0,    100, 100, 50,  200),
  _item('Engagement monitoring + replies',   0, 0,    100, 100, 50,  200),
  _item('Monthly social report',             0, 0,    100, 100, 100, 300),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

_register('seo-report', _def('Monthly SEO Health Report', [
  _item('Google Search Console data pull',   0, 0,    0,  0,   0,   0),
  _item('Keyword position tracking',         0, 0,    100, 100, 50,  200),
  _item('Technical SEO crawl (Sitebulb)',  200, 2000, 30, 30),
  _item('Page speed analysis (Lighthouse)',  0, 0,    0,  0,   0,   0),
  _item('Broken link check',                 0, 0,    100, 100, 50,  100),
  _item('Competitor comparison (top 3)',     0, 0,    100, 100, 100, 300),
  _item('Actionable recommendations',        0, 0,    100, 100, 50,  200),
  _item('PDF report generation (branded)',    0, 0,    100, 100, 50,  200),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

// --- Growth plan add-ons ---

_register('google-ads-setup', _def('Google Ads Setup — Search + Maps + PMax + YouTube', [
  _item('Google Ads account + conversion tracking', 0, 0,    0,  0,   0,   0),
  _item('Search Ads — keyword research + text ad copy', 0, 0,    100, 100, 200, 600),
  _item('Maps / Local Services Ads — listing + geo-setup', 0, 0,    100, 100, 150, 500),
  _item('Performance Max — image assets + headlines', 0, 0,    100, 100, 150, 500),
  _item('YouTube Ads — bumper + discovery ad setup', 0, 0,    100, 100, 100, 400),
  _item('Landing page optimization for ads', 0, 0,    100, 100, 100, 300),
  _item('Ad extensions — call, location, sitelink', 0, 0,    100, 100, 100, 300),
  _item('Budget strategy + bid management setup', 0, 0,    100, 100, 100, 300),
], { deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹2K–10K/mo recommended)' }))

_register('meta-ads-setup', _def('Meta Ads Setup — Facebook + Instagram + WhatsApp + Messenger', [
  _item('Meta Business Suite + Commerce Manager setup', 0, 0,    0,  0,   0,   0),
  _item('FB Pixel + CAPI event setup (shared)', 0, 0,    0,  0,   0,   0),
  _item('Facebook Feed + Stories — image ads + copy', 0, 0,    100, 100, 200, 600),
  _item('Instagram Feed + Stories + Reels — vertical ads', 0, 0,    100, 100, 200, 600),
  _item('WhatsApp — WATI/Interakt platform subscription', 500, 5000, 40, 40),
  _item('WhatsApp — Business API message templates', 0, 0,    100, 100, 100, 400),
  _item('Messenger — click-to-Messenger flow setup', 0, 0,    0,  0,   0,   0),
  _item('Audience research — custom + lookalike', 0, 0,    100, 100, 150, 500),
  _item('Campaign structure — prospecting + retargeting', 0, 0,    100, 100, 100, 300),
  _item('Budget strategy + bid setup', 0, 0,    100, 100, 100, 300),
], { deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Meta (~₹3K–15K/mo recommended)' }))

_register('growth-city', _def('Cover another city', [
  _item('City landing page (design+dev)',        0, 0,    100, 100, 150, 600),
  _item('Local citations (15 directories)',      0, 0,    100, 100, 100, 400),
  _item('City-specific keyword research',        0, 0,    100, 100, 100, 300),
  _item('GBP location setup',                    0, 0,    100, 100, 100, 300),
  _item('City schema markup',                    0, 0,    100, 100, 50,  200),
  _item('BrightLocal citation tool',            100, 1000, 30, 30),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

// --- Scale plan services ---

_register('account-manager', _def('Dedicated Growth Manager', [
  _item('Slack/WhatsApp priority channel',   0, 0,    0,  0,   0,   0),
  _item('Monthly 1-hr strategy call',        0, 0,    100, 100, 150, 500),
  _item('Quarterly business review deck',    0, 0,    100, 100, 100, 400),
  _item('Notion/Linear task management',     0, 0,    0,  0,   0,   0),
  _item('4-hr response SLA (biz hrs)',       0, 0,    100, 100, 100, 300),
  _item('Weekly async update',               0, 0,    100, 100, 50,  200),
]))

_register('unlimited-updates', _def('Content & Page Updates — Unlimited', [
  _item('Content update labor (~10hrs/mo)',   0, 0,    100, 100, 300, 1000),
  _item('Design tweaks in Figma',             0, 0,    100, 100, 100, 400),
  _item('Development + deploy',               0, 0,    100, 100, 100, 400),
  _item('QA + regression testing',            0, 0,    100, 100, 100, 300),
  _item('Image replacement + optimization',   0, 0,    100, 100, 50,  200),
]))

_register('social-reels', _def('Social Media — Reels & Stories', [
  _item('Content ideation + storyboards',        0, 0,    100, 100, 200, 600),
  _item('Stock footage (Artgrid/Storyblocks)', 300, 3000, 40, 40),
  _item('Video editing (CapCut Pro)',          150, 1500, 40, 40),
  _item('Trending audio research',                0, 0,    100, 100, 50,  200),
  _item('Motion graphics + text overlays',        0, 0,    100, 100, 100, 400),
  _item('Caption writing + hashtag pack',         0, 0,    100, 100, 50,  200),
  _item('Instagram Stories design (8/mo)',        0, 0,    100, 100, 150, 500),
  _item('Posting schedule + tracking',            0, 0,    100, 100, 50,  200),
]))

_register('google-ads-management', _def('Google Ads Management — Search + Maps + PMax + YouTube', [
  _item('Search Ads — weekly bid + keyword optimization', 0, 0,    100, 100, 200, 500),
  _item('Maps Ads — geo-performance tuning', 0, 0,    100, 100, 150, 400),
  _item('Performance Max — asset refresh + optimization', 0, 0,    100, 100, 150, 400),
  _item('YouTube Ads — video performance review', 0, 0,    100, 100, 100, 300),
  _item('A/B testing (2 variants/month)', 0, 0,    100, 100, 100, 300),
  _item('Search term mining + negative keyword adds', 0, 0,    100, 100, 100, 300),
  _item('Remarketing audience setup + refresh', 0, 0,    100, 100, 100, 300),
  _item('Performance dashboard (Looker Studio)', 0, 0,    100, 100, 100, 400),
  _item('Monthly ads performance report', 0, 0,    100, 100, 100, 300),
], { deliverDays: 1, stage: 'build', clientCostNote: 'Ad budget paid directly to Google (~₹5K–25K/mo recommended)' }))

_register('meta-ads-management', _def('Meta Ads Management — FB + IG + WhatsApp + Messenger', [
  _item('Facebook — weekly bid + audience optimization', 0, 0,    100, 100, 150, 400),
  _item('Instagram — creative refresh + Reels ad optimization', 0, 0,    100, 100, 150, 400),
  _item('WhatsApp — WATI/Interakt platform', 500, 5000, 40, 40),
  _item('WhatsApp — marketing conversation costs (~50/mo)', 250, 2500, 30, 30),
  _item('WhatsApp — template updates + flow optimization', 0, 0,    100, 100, 100, 300),
  _item('Messenger — auto-reply flow updates', 0, 0,    100, 100, 50,  200),
  _item('A/B testing (2 variants/month)', 0, 0,    100, 100, 100, 300),
  _item('Creative refresh (4 new ads/month)', 0, 0,    100, 100, 150, 400),
  _item('Audience refinement + exclusions', 0, 0,    100, 100, 100, 300),
  _item('Remarketing campaign management', 0, 0,    100, 100, 100, 300),
  _item('Advantage+ / dynamic creative optimization', 0, 0,    100, 100, 100, 300),
  _item('Competitor ad analysis', 0, 0,    100, 100, 100, 300),
  _item('Monthly performance report', 0, 0,    100, 100, 100, 300),
], { clientCostNote: 'Ad budget paid directly to Meta (~₹10K–50K/mo recommended)' }))

_register('competitor', _def('Competitor & Market Analysis', [
  _item('Competitor website audit (3)',       0, 0,    100, 100, 100, 400),
  _item('SEMrush domain comparison',          0, 0,    0,  0,   0,   0),
  _item('SWOT analysis document',             0, 0,    100, 100, 100, 300),
  _item('Market positioning recommendations', 0, 0,    100, 100, 100, 300),
  _item('Gap analysis — services you lack',   0, 0,    100, 100, 100, 300),
  _item('PDF report with exec summary',       0, 0,    100, 100, 100, 300),
  _item('SimilarWeb traffic estimation',    100, 1000, 30, 30),
]))

_register('strategy', _def('Monthly Strategy Call & Report', [
  _item('Data gathering (analytics+SEO+soc)', 0, 0,    100, 100, 100, 300),
  _item('KPI tracking spreadsheet update',    0, 0,    100, 100, 50,  200),
  _item('Strategy deck — 10 slides',           0, 0,    100, 100, 150, 500),
  _item('1-hr video call + screen share',      0, 0,    100, 100, 100, 400),
  _item('Call recording + shared notes',       0, 0,    100, 100, 50,  200),
  _item('Next month action items doc',         0, 0,    100, 100, 100, 300),
]))

// --- Scale plan add-ons ---

_register('scale-priority', _def('Same-day priority support', [
  _item('Priority queue in support system', 0, 0,    0,  0,   0,   0),
  _item('2-hr response SLA (biz hrs)',      0, 0,    100, 100, 200, 500),
  _item('Emergency hotline routing',      100, 1000, 40, 40),
]))

_register('scale-multi', _def('Multi-location', [
  _item('Additional GBP setup',             0, 0,    100, 100, 200, 600),
  _item('Location landing page',            0, 0,    100, 100, 150, 500),
  _item('Local citations for new loc',      0, 0,    100, 100, 100, 400),
  _item('Location schema + geo sitemap',    0, 0,    100, 100, 100, 300),
  _item('BrightLocal citation tool',      150, 1500, 30, 30),
], { deliverDays: 1, stage: 'build' }))

// --- Launch add-ons (continued) ---

_register('business-email', _def('Business Email Setup', [
  _item('Zoho Mail account setup + domain verification', 0, 0,    100, 100, 150, 500),
  _item('DNS MX record configuration', 0, 0,    100, 100, 50,  200),
  _item('SPF + DKIM + DMARC email authentication', 0, 0,    100, 100, 50,  200),
  _item('Email signature design + setup', 0, 0,    100, 100, 50,  200),
  _item('Forwarding rules + aliases', 0, 0,    100, 100, 50,  150),
  _item('IMAP/SMTP guide for mobile + desktop', 0, 0,    100, 100, 50,  150),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

// --- Growth add-ons (continued) ---

_register('email-marketing-setup', _def('Email Marketing Setup — Templates + Automation + List Import', [
  _item('Platform setup (Brevo/Mailchimp/MailerLite)', 0, 1300, 0, 30),
  _item('Branded newsletter template (HTML)', 0, 0,    100, 100, 200, 600),
  _item('Subscriber list import + segmentation', 0, 0,    100, 100, 100, 300),
  _item('Welcome email automation flow', 0, 0,    100, 100, 100, 400),
  _item('Signup form embed on website', 0, 0,    100, 100, 50,  200),
  _item('GDPR / opt-in compliance setup', 0, 0,    100, 100, 50,  200),
  _item('Test send + deliverability check', 0, 0,    0,  0,   0,   0),
], { deliverDays: 0.5, stage: 'build' }))

_register('sms-marketing', _def('SMS Marketing — Campaigns + Automation + DND Compliance', [
  _item('SMS platform setup (Twilio/Textlocal/Exotel)', 0, 0,    0,  0,   0,   0),
  _item('DND scrub + TRAI compliance registration', 0, 0,    100, 100, 100, 300),
  _item('Message templates — appointment, offer, reminder', 0, 0,    100, 100, 100, 400),
  _item('DLT template registration (India)', 0, 0,    100, 100, 100, 300),
  _item('Campaign scheduling + automation', 0, 0,    100, 100, 50,  200),
  _item('Opt-out / STOP handling in templates', 0, 0,    100, 100, 25,  100),
  _item('SMS sending costs (~500 msgs/month)', 250, 2500, 30, 30),
  _item('Monthly delivery + conversion report', 0, 0,    100, 100, 50,  200),
], { clientCostNote: 'SMS credits paid directly to provider (~₹0.25–0.50/msg). Estimated 500 msgs = ~₹200/mo.' }))

// --- Scale services (continued) ---

_register('email-marketing', _def('Email Marketing Management — Campaigns + Optimization + Reporting', [
  _item('Monthly newsletter campaigns (2–4 sends)', 0, 0,    100, 100, 200, 600),
  _item('Content + copywriting for campaigns', 0, 0,    100, 100, 150, 500),
  _item('Template updates + seasonal designs', 0, 0,    100, 100, 100, 400),
  _item('A/B subject line testing + optimization', 0, 0,    100, 100, 100, 300),
  _item('List cleaning + inactive subscriber pruning', 0, 0,    100, 100, 50,  200),
  _item('Re-engagement campaign (quarterly)', 0, 0,    100, 100, 75,  250),
  _item('Performance analytics report', 0, 0,    100, 100, 100, 300),
]))

// --- Launch add-ons (continued) ---

_register('staff-training', _def('Staff Handover Training — 1–2 Hour Session', [
  _item('WhatsApp Business reply guide + templates', 0, 0,    100, 100, 100, 300),
  _item('GBP posting guide (offers, photos, replies)', 0, 0,    100, 100, 100, 300),
  _item('Basic website CMS walkthrough', 0, 0,    100, 100, 100, 300),
  _item('SMS / email campaign dashboard overview', 0, 0,    100, 100, 50,  200),
  _item('Live session delivery (1–2 hrs)', 0, 0,    100, 100, 150, 500),
  _item('Quick reference cheat sheet (PDF)', 0, 0,    100, 100, 50,  200),
], { deliverDays: 1 }))

_register('brochure-pdf', _def('Brochure / Catalog PDF — WhatsApp Optimized', [
  _item('Design — 4 page A4 / digital layout', 0, 0,    100, 100, 200, 600),
  _item('Content writing — services + about + contact', 0, 0,    100, 100, 150, 500),
  _item('Stock / client photo sourcing (8 images)', 0, 200,  0,  50),
  _item('PDF compression for WhatsApp sharing', 0, 0,    100, 100, 50,  200),
  _item('Mobile + print optimized export', 0, 0,    100, 100, 50,  200),
], { deliverDays: 1, stage: 'design' }))

_register('ordering-page', _def('Online Ordering Page — WhatsApp Form', [
  _item('Order form design (items, quantity, note)', 0, 0,    100, 100, 100, 300),
  _item('Form fields — name, phone, address, special request', 0, 0,    100, 100, 50,  200),
  _item('WhatsApp submission integration', 0, 0,    100, 100, 100, 300),
  _item('Order confirmation auto-reply template', 0, 0,    100, 100, 50,  200),
  _item('Deploy + testing', 0, 0,    100, 100, 50,  200),
], { deliverDays: 1, stage: 'build' }))

// --- Growth services (continued) ---

_register('gbp-monthly', _def('Monthly GBP Management — Posts + Offers + Review Replies', [
  _item('Weekly business posts (4/mo) — offers, updates, photos', 0, 0,    100, 100, 150, 500),
  _item('Photo optimization + geo-tagging for each post', 0, 0,    100, 100, 50,  200),
  _item('Offer / promotion post design (Canva)', 0, 0,    100, 100, 100, 300),
  _item('Review reply drafting (all reviews)', 0, 0,    100, 100, 100, 300),
  _item('Q&A section monitoring + replies', 0, 0,    100, 100, 50,  200),
  _item('Monthly GBP insights report + recommendations', 0, 0,    100, 100, 100, 300),
], { deliverDays: 0.25, parallel: true, stage: 'setup' }))

// --- Growth add-ons (continued) ---

_register('blog-content', _def('Blog / Content Writing — 2–4 Posts/Month', [
  _item('Topic research + keyword selection', 0, 0,    100, 100, 100, 300),
  _item('Writing — 600–800 words per post', 0, 0,    100, 100, 150, 500),
  _item('Featured image sourcing + optimization', 0, 200,  0,  50),
  _item('On-page SEO — headings, meta, internal links', 0, 0,    100, 100, 100, 300),
  _item('Publishing + formatting on website', 0, 0,    100, 100, 50,  200),
  _item('Monthly content performance report', 0, 0,    100, 100, 50,  200),
], { deliverDays: 0.25, parallel: true }))

_register('qr-suite', _def('QR Suite — Menu + UPI Payment + WhatsApp', [
  _item('QR code generation (mobile-responsive)', 0, 0,    0,  0,   0,   0),
  _item('Menu landing page design (responsive)', 0, 0,    100, 100, 150, 500),
  _item('UPI payment link / QR integration', 0, 0,    0,  0,   0,   0),
  _item('WhatsApp click-to-chat QR link', 0, 0,    0,  0,   0,   0),
  _item('Printable A4 PDF with all 3 QR codes', 0, 0,    100, 100, 100, 400),
  _item('Sticker / table stand design (print-ready)', 0, 0,    100, 100, 100, 300),
], { deliverDays: 1, stage: 'design' }))

_register('festive-campaign', _def('Festive Campaign Pack — Diwali / Holi / New Year', [
  _item('Campaign theme design + branding', 0, 0,    100, 100, 200, 600),
  _item('Social media posts (5) — Instagram + Facebook', 0, 0,    100, 100, 200, 600),
  _item('Email blast template + send', 0, 0,    100, 100, 150, 400),
  _item('SMS broadcast template + send', 0, 0,    100, 100, 100, 300),
  _item('WhatsApp Business broadcast template', 0, 0,    100, 100, 100, 300),
  _item('Festive offer / discount creative (2 variants)', 0, 0,    100, 100, 100, 300),
], { deliverDays: 2, stage: 'design', clientCostNote: 'SMS credits billed separately (~₹0.25–0.50/msg per broadcast)' }))

// ---------------------------------------------------------------------------
// Build the lookup map
// ---------------------------------------------------------------------------

const _serviceMap: Record<string, CatalogService> = {}
for (const [id, def] of Object.entries(_allServices)) {
  _serviceMap[id] = {
    id,
    service: {
      label: def.label,
      items: def.items,
      clientCostNote: def.clientCostNote,
    },
    unitLabel: def.unitLabel,
    deliverDays: def.deliverDays,
    parallel: def.parallel,
    stage: def.stage,
  }
}

export function pickServices(ids: string[]): CatalogService[] {
  return ids.map((id) => {
    const svc = _serviceMap[id]
    if (!svc) throw new Error(`Unknown service: ${id}`)
    return structuredClone(svc)
  })
}

export const allServices = _serviceMap
