export type ServiceStage = 'design' | 'build' | 'setup'

export interface ServiceItem {
  label: string
  costPrice: { setup: number; monthly: number; annual: number }
  profitMargin: { setup: number; monthly: number; annual: number }
  sellingPrice?: { setup?: number; monthly?: number; annual?: number }
}

export interface ServiceAggregate {
  cost: { setup: number; monthly: number; annual: number }
  selling: { setup: number; monthly: number; annual: number }
  margin: { setup: number; monthly: number; annual: number }
}

export interface ServiceFaq {
  question: string
  answer: string
}

export interface Service {
  id: string
  label: string
  description?: string
  details?: string
  benefits?: string[]
  overview?: string[]
  howItWorks?: string[]
  faqs?: ServiceFaq[]
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

function selling(cost: number, margin: number): number {
  return Math.round(cost * (1 + margin / 100))
}

export function computeItemSelling(item: ServiceItem) {
  return {
    setup: item.sellingPrice?.setup ?? selling(item.costPrice.setup, item.profitMargin.setup),
    monthly: item.sellingPrice?.monthly ?? selling(item.costPrice.monthly, item.profitMargin.monthly),
    annual: item.sellingPrice?.annual ?? selling(item.costPrice.annual, item.profitMargin.annual),
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
    margin: {
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
  marginSetup: number,
  marginMonthly: number,
  marginAnnual: number,
  sellSetup?: number,
  sellMonthly?: number,
  sellAnnual?: number,
): ServiceItem {
  const result: ServiceItem = {
    label,
    costPrice: { setup: costSetup, monthly: costMonthly, annual: costAnnual },
    profitMargin: { setup: marginSetup, monthly: marginMonthly, annual: marginAnnual },
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
    description: 'A fast, mobile-perfect website designed around how your customers search — built to turn visitors into enquiries.',
    icon: 'Globe',
    section: 'build',
    details: 'A complete, professional website built for local businesses — up to five pages, mobile-perfect, and designed to turn visitors into enquiries. We handle everything from your domain and hosting to design, content, and SEO basics, so you launch with a site that looks established, loads fast, and shows up where your customers search.',
    benefits: ['Look established and trustworthy the moment a customer finds you', 'Show up in Google searches for your products and services', 'Turn visitors into enquiries with clear, easy contact options', 'Work beautifully on every phone — where most customers find you', 'Launch fast without hiring a developer or juggling vendors'],
    overview: ['Your website is your storefront on the internet — the first place customers look before they call, visit, or buy. A fast, professional website tells them your business is real, trustworthy, and ready to help, while a slow or missing one quietly sends them to a competitor.', 'This service is built for local businesses that want a complete online presence without hiring a developer. Whether you run a clinic, a salon, a restaurant, or a home-services firm, we design and launch up to five pages that match how your customers actually search — so the people already looking for you find you, and turn into enquiries.'],
    howItWorks: ['We learn your business, customers, and what you want the website to achieve.', 'We design the layout and write clear, search-friendly content for each page.', 'You review the draft and we refine it until you are happy.', 'We launch on your own domain, fully tested and mobile-friendly.'],
    faqs: [{ question: 'How long does it take to build my website?', answer: 'Most websites are designed, built, and live within a few days of confirming your content and branding.' }, { question: 'Can I update the website myself later?', answer: 'Yes. We hand over access and can also handle updates for you under our monthly care plans.' }, { question: 'Do I need to buy a domain and hosting separately?', answer: 'No. Domain, SSL, and hosting are all handled as part of the build, so you have one bill and one partner.' }, { question: 'Will my website work on phones?', answer: 'Absolutely. Every page is tested on mobile and desktop, since most of your customers will visit from a phone.' }],
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
    description: 'A chat button on every page so customers message you directly — with a pre-chat name and phone form so you never miss a lead.',
    icon: 'MessageSquare',
    section: 'build',
    details: 'Add a WhatsApp chat button to every page of your website so customers can message you in one tap. A pre-chat form captures names and phone numbers so you never miss a lead, even when you are offline.',
    benefits: ['Make it one tap for customers to reach you', 'Never miss a lead — capture names and numbers even when you are busy', 'Reply from WhatsApp, where your customers already are'],
    overview: ['Most customers prefer to message a business rather than fill a form or make a call. A WhatsApp chat button turns that preference into enquiries by letting visitors reach you in a single tap, directly from the page they are already reading.', 'Because the button captures the customer’s name and phone number before they message, you keep a record of every enquiry — even the ones that arrive after hours or while you are busy serving other customers.'],
    howItWorks: ['We add a chat bubble to every page of your website.', 'Visitors tap it and land in a WhatsApp conversation with you.', 'A short pre-chat form captures their name and phone number first.', 'You receive the enquiry and reply straight from WhatsApp.'],
    faqs: [{ question: 'Do customers need WhatsApp to message me?', answer: 'Yes, the button opens WhatsApp on their phone, where most of your customers already are.' }, { question: 'Can I see who messaged me if I miss it?', answer: 'Yes, the pre-chat form records names and numbers so no enquiry is lost.' }, { question: 'Does this work on desktop too?', answer: 'Yes, desktop visitors can open WhatsApp Web to continue the conversation.' }, { question: 'Will it slow down my website?', answer: 'No. The chat button is lightweight and loads without affecting page speed.' }],
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
    description: 'Your Google Business Profile created, verified, and optimized so you appear when local customers search for what you sell.',
    icon: 'MapPin',
    section: 'build',
    details: 'Get your Google Business Profile created, verified, and fully optimized so you show up when local customers search for what you sell.',
    benefits: ['Appear on Google Maps when local customers search for you', 'Show your business info, photos, and reviews in one trusted place', 'Build credibility with a verified, complete profile'],
    overview: ['When local customers search for a business like yours, Google shows a map with nearby options first. If your Google Business Profile is missing or incomplete, you are invisible in exactly the place buyers are looking.', 'We create, verify, and fully optimize your profile so it shows the right name, hours, photos, and services — helping you appear on Google Maps and build trust before a customer ever visits your website.'],
    howItWorks: ['We set up your profile with accurate business information and categories.', 'We handle the verification steps so Google confirms your business is real.', 'We add photos, service areas, and the details customers look for.', 'Your profile goes live and starts appearing in local searches.'],
    faqs: [{ question: 'Why does Google need to verify my business?', answer: 'Verification proves your business is real and located where you say, which is required before it appears on Maps.' }, { question: 'Can I manage the profile myself afterwards?', answer: 'Yes. We hand over access and can also keep it updated for you.' }, { question: 'Do I need a website for a Google Business Profile?', answer: 'A website helps, but you can start with your profile alone and add a site later.' }, { question: 'How soon will I appear on Google Maps?', answer: 'Once verified, most businesses start appearing within a few days.' }],
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
    description: 'Tracking installed so you can see exactly what is working — visits, enquiries, and calls — in one plain-English report.',
    icon: 'BarChart3',
    section: 'build',
    details: 'See exactly what is working on your website — visits, enquiries, and calls — in one plain-English report.',
    benefits: ['See which marketing is actually bringing customers', 'Understand visits, enquiries, and calls in plain English', 'Stop guessing and spend your budget where it works'],
    overview: ['You cannot improve what you cannot measure. Visit analytics shows you how many people come to your website, where they come from, and — most importantly — whether they call, message, or enquire.', 'Instead of a wall of confusing charts, we turn the numbers into plain-English answers: what is working, what is not, and where to spend your next rupee.'],
    howItWorks: ['We install tracking across your website and goals.', 'We set up conversion tracking for enquiries and calls.', 'We build a simple dashboard you can read at a glance.', 'We explain what the numbers mean and what to do next.'],
    faqs: [{ question: 'Do I need technical skills to read the reports?', answer: 'No. The dashboard is built for business owners, not analysts.' }, { question: 'Can I see which marketing brings customers?', answer: 'Yes, we tag each campaign so you can see exactly which one produces enquiries.' }, { question: 'Is customer data private?', answer: 'Yes. We use privacy-compliant analytics and only you see your business data.' }, { question: 'How often do reports update?', answer: 'Data updates continuously, so you can check anytime.' }],
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
    description: 'Additional content pages written, designed, and optimized for SEO — as many as your business needs.',
    icon: 'FileText',
    section: 'build',
    details: 'Add extra content pages to your website — written, designed, and SEO-optimized — as many as your business needs to rank for more searches.',
    benefits: ['Rank for more searches by covering more topics', 'Give customers detailed information that builds trust'],
    overview: ['Every extra page on your website is another chance to rank for a search and answer a question. If you only have a homepage, you are missing the customers who search for specific services or locations.', 'We write, design, and publish additional pages tailored to the searches you want to win — each one optimized to load fast and convert visitors into enquiries.'],
    howItWorks: ['We identify the topics and searches worth targeting.', 'We write clear, SEO-friendly content for each new page.', 'We design and build the page to match your website.', 'We publish and check it looks great on every device.'],
    faqs: [{ question: 'How many pages should I add?', answer: 'As many as your services and locations need. We can add pages one at a time or in batches.' }, { question: 'Will new pages rank on Google?', answer: 'Each page is optimized for a specific search, which gives it the best chance to rank.' }, { question: 'Can you update existing pages instead?', answer: 'Yes, we can rewrite and improve your current pages too.' }, { question: 'Do I need to provide the content?', answer: 'No. We research and write the content for you.' }],
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
    description: 'Professionally sourced and optimized images that make your site look polished and load fast.',
    icon: 'Image',
    section: 'build',
    details: 'Professionally sourced and optimized images that make your website look polished and load fast, without hiring a photographer.',
    benefits: ['Make your website look polished and professional', 'Keep pages loading fast so customers do not leave'],
    overview: ['Photos are the fastest way to show customers what your business is like. Blurry or stock-looking images make you look unprofessional, while clean, optimized photos build instant trust.', 'We source and prepare professional images that fit your brand, then compress them so they look sharp without slowing your website down.'],
    howItWorks: ['We review your website and choose where new photos are needed.', 'We source licensed, high-quality images that match your business.', 'We optimize each image for fast loading on phones and desktops.', 'We place them on your site with proper captions and descriptions.'],
    faqs: [{ question: 'Can I use my own photos?', answer: 'Yes, we can optimize and use photos you already have, or source new ones.' }, { question: 'Will large photos slow my site down?', answer: 'No. We compress every image so pages load quickly.' }, { question: 'Do the photos have legal rights?', answer: 'Yes, we only use properly licensed images.' }, { question: 'How many photos can I add?', answer: 'As many as your site needs. We work in batches to keep it affordable.' }],
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
    description: 'Your domain connected, configured, and secured so everything points to your site.',
    icon: 'Link',
    section: 'build',
    details: 'Your custom domain connected, configured, and secured so every visitor lands on your website reliably.',
    benefits: ['Give customers a reliable address they can trust', 'Protect your site with a secure connection'],
    overview: ['Your domain is your address on the internet — it is what customers type, remember, and trust. A properly configured domain makes sure every visitor reaches your site reliably and securely.', 'We connect your domain, set up the necessary records, and make sure security certificates renew automatically so your site never shows a warning or goes offline.'],
    howItWorks: ['We review or register your domain name.', 'We configure the records so it points to your website.', 'We set up secure connections and email forwarding.', 'We verify everything works before going live.'],
    faqs: [{ question: 'Can I keep my existing domain?', answer: 'Yes, we connect your current domain to your website.' }, { question: 'What if I do not have a domain yet?', answer: 'We help you choose and register one as part of the setup.' }, { question: 'Will my site be secure?', answer: 'Yes, SSL is configured and renews automatically.' }, { question: 'Do I need to understand DNS?', answer: 'No. We handle all the technical setup for you.' }],
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
    description: 'Your profile polished with photos, categories, offers, and posts so it stands out against every competitor in your area.',
    icon: 'MapPin',
    section: 'get-found',
    details: 'Keep your Google Business Profile active and climbing with weekly posts, fresh photos, and review generation — so you stand out against every competitor in your area.',
    benefits: ['Stay visible and active on Google with fresh posts and photos', 'Stand out against competitors in your area', 'Turn happy customers into visible reviews'],
    overview: ['A Google Business Profile is not a set-it-and-forget-it listing. Profiles that post fresh photos, offers, and updates regularly get more views, calls, and visits than inactive competitors.', 'This monthly service keeps your profile active and climbing — with regular posts, fresh photos, and review generation that keep you ahead of every other business in your area.'],
    howItWorks: ['We plan a monthly calendar of posts, offers, and updates.', 'We create and publish fresh content to your profile.', 'We encourage and manage customer reviews.', 'We report your rankings and visibility each month.'],
    faqs: [{ question: 'How often do you post?', answer: 'We publish roughly four posts a month, plus photo and offer updates.' }, { question: 'Will this help me rank higher on Maps?', answer: 'Active, optimized profiles tend to rank better than inactive competitors.' }, { question: 'Do you reply to customer reviews?', answer: 'Yes, we draft professional replies you can approve.' }, { question: 'Can I see the results?', answer: 'You get a monthly report showing views, calls, and ranking changes.' }],
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
    description: 'Rank for searches like plumber near me in your city. We optimize your presence so the people already looking for you find you first.',
    icon: 'Search',
    section: 'get-found',
    details: 'Rank on Google Maps for searches like \'plumber near me\' in your city. We optimize your presence so the people already searching for you find you first.',
    benefits: ['Rank for \'near me\' searches in your city', 'Get found by customers already looking for what you sell', 'Win more local business over competitors who ignore SEO'],
    overview: ['When someone in your city searches for what you sell, you want to be the business they see first. Local SEO makes that happen by optimizing your online presence for exactly those nearby searches.', 'This service combines keyword research, directory listings, and consistency checks so search engines trust your business and show it to the customers already looking for you.'],
    howItWorks: ['We research the local keywords your customers actually search.', 'We list your business consistently across relevant directories.', 'We audit and fix your name, address, and phone details everywhere.', 'We build local authority and track your rankings monthly.'],
    faqs: [{ question: 'How is local SEO different from regular SEO?', answer: 'Local SEO focuses on ranking for searches near your location, like "dentist near me".' }, { question: 'How long until I see results?', answer: 'Local SEO builds over weeks and months, with steady gains rather than overnight jumps.' }, { question: 'Do I need a website for this to work?', answer: 'A website helps, but your Google profile and listings can rank even without one.' }, { question: 'What do directory citations do?', answer: 'Consistent listings build trust with Google and help customers find you in more places.' }],
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
    description: 'Instant auto-replies, quick-reply menus, and a booking flow so customers help themselves 24/7.',
    icon: 'MessageSquare',
    section: 'automate',
    details: 'Automate your WhatsApp with instant auto-replies, quick-reply menus, and a booking flow so customers help themselves 24/7.',
    benefits: ['Answer customers instantly, even outside business hours', 'Save your team hours of repetitive replies', 'Let customers help themselves 24/7'],
    overview: ['Your customers expect instant answers, even when you are closed or busy. WhatsApp automation replies to them immediately, answers common questions, and can even take bookings — without you typing a single message.', 'This is about saving time and never losing a lead. Instead of missed calls and delayed replies, every enquiry gets an instant, helpful response around the clock.'],
    howItWorks: ['We set up your WhatsApp business account and tools.', 'We create instant greeting and away-message flows.', 'We build quick-reply menus for common questions.', 'We add a booking flow and hand over the dashboard.'],
    faqs: [{ question: 'Will automation feel robotic to customers?', answer: 'No. We write natural, on-brand replies that sound like your team.' }, { question: 'Can customers still reach a human?', answer: 'Yes, the flow always offers a path to a real person.' }, { question: 'Does this work 24/7?', answer: 'Yes, automated replies run around the clock.' }, { question: 'Do I need special software?', answer: 'We set up and manage the platform as part of the service.' }],
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
    description: 'We ask happy customers for reviews after every sale, building the social proof that turns searchers into customers.',
    icon: 'Star',
    section: 'get-found',
    details: 'Turn happy customers into visible reviews with automatic requests after every sale — building the social proof that turns searchers into buyers.',
    benefits: ['Build social proof that turns searchers into customers', 'Rank higher with more fresh reviews', 'Handle negative feedback privately before it hurts your reputation'],
    overview: ['Before most customers choose a business, they check its reviews. A steady stream of recent, positive reviews is one of the strongest signals that your business is trustworthy.', 'We make asking for reviews automatic — a happy customer finishes their purchase and immediately gets a polite request to share their experience, building your reputation without you having to chase anyone.'],
    howItWorks: ['We set up a simple review link and redirect to your profile.', 'We automate polite review requests after each sale.', 'We monitor new reviews and flag anything needing attention.', 'We showcase your best reviews on your website.'],
    faqs: [{ question: 'Is it appropriate to ask customers for reviews?', answer: 'Yes. A polite, timely request is normal and most happy customers are glad to help.' }, { question: 'What about negative reviews?', answer: 'We help you respond professionally and route feedback privately so it is resolved.' }, { question: 'Which platforms do you cover?', answer: 'Primarily Google, and we can include Facebook and others.' }, { question: 'Can I see all my reviews in one place?', answer: 'Yes, we provide a dashboard and monthly summary.' }],
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
    description: 'A steady stream of posts, creatives, and captions that keep your business top-of-mind with the people who matter.',
    icon: 'Share2',
    section: 'stay-active',
    details: 'A steady stream of branded posts, creatives, and captions that keep your business top-of-mind on social media.',
    benefits: ['Stay top-of-mind with a consistent presence', 'Show your work, offers, and personality to new audiences', 'Build a following without spending hours on content'],
    overview: ['Customers research businesses on social media before they buy. A consistent stream of posts keeps your business in front of them and shows you are active, credible, and worth choosing.', 'This service handles the work you never have time for — planning, writing, and designing a month of posts — so your social presence grows without eating your schedule.'],
    howItWorks: ['We plan a monthly content calendar around your business.', 'We write captions and design on-brand creatives.', 'We publish posts on a consistent schedule.', 'We monitor engagement and report results monthly.'],
    faqs: [{ question: 'How many posts do I get each month?', answer: 'Eight posts per month, planned and designed for you.' }, { question: 'Do I need to approve posts before they go live?', answer: 'Yes, we share the calendar and creatives for your approval first.' }, { question: 'Which platforms do you cover?', answer: 'Instagram and Facebook, with content reusable for others.' }, { question: 'Can you use my own photos?', answer: 'Yes, we can use your photos or source licensed images.' }],
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
    description: 'A plain-English report on keyword positions, broken links, and competitors — with actions, not jargon.',
    icon: 'BarChart3',
    section: 'get-found',
    details: 'A plain-English monthly report on your keyword positions, broken links, and competitors — with clear actions, not jargon.',
    benefits: ['Know exactly where your website stands each month', 'Get clear actions instead of confusing jargon', 'Track what is improving so you can invest with confidence'],
    overview: ['Most businesses have no idea whether their website is improving or quietly losing ground. A monthly SEO report answers that question in plain language, with clear actions you can actually act on.', 'We track your keyword positions, check for broken links and technical issues, and compare you against competitors — then summarize what matters and what to do next.'],
    howItWorks: ['We pull data from Search Console and tracking tools.', 'We check your keyword positions and site health.', 'We compare your performance against competitors.', 'We deliver a plain-English report with recommendations.'],
    faqs: [{ question: 'Do I need to understand SEO to use the report?', answer: 'No. The report is written for business owners, with clear recommendations.' }, { question: 'How often do I get a report?', answer: 'Monthly, so you can track progress over time.' }, { question: 'Will you fix the issues you find?', answer: 'We can, or we can hand clear instructions to your team.' }, { question: 'What tools do you use?', answer: 'A mix of Google’s free tools and professional SEO software.' }],
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
    description: 'Ad campaigns that put you in front of people searching for your service right now — and pay only for results.',
    icon: 'Search',
    section: 'grow',
    details: 'Launch Google Ads campaigns that put you in front of people searching for your service right now — and pay only for results.',
    benefits: ['Put your business in front of people searching right now', 'Pay only for real results', 'Start generating leads immediately'],
    overview: ['Search ads put your business in front of people who are actively looking for what you sell — right at the moment they are ready to buy. Unlike a website that takes time to rank, ads can start bringing enquiries within days.', 'We set up your campaigns the right way from day one: the right keywords, compelling ad copy, and conversion tracking, so you only pay for real results and can see exactly what each rupee returns.'],
    howItWorks: ['We research the keywords your customers search for.', 'We write ad copy and set up Search, Maps, and video campaigns.', 'We configure conversion tracking and budgets.', 'We launch and review early performance with you.'],
    faqs: [{ question: 'How much does the ad budget cost?', answer: 'Your ad budget is paid directly to Google — typically a few thousand rupees a month to start.' }, { question: 'How soon will I get enquiries?', answer: 'Campaigns can start producing clicks and calls within days of launch.' }, { question: 'Do you manage the ads after setup?', answer: 'Setup is separate from ongoing management, which we also offer monthly.' }, { question: 'Can I pause the ads anytime?', answer: 'Yes, you control the budget and can pause whenever you like.' }],
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
    description: 'Facebook, Instagram, and WhatsApp ads set up to reach the exact audience you want — with pixel and conversion tracking.',
    icon: 'Share2',
    section: 'grow',
    details: 'Set up Facebook, Instagram, and WhatsApp ads to reach your exact audience — with pixel and conversion tracking from day one.',
    benefits: ['Reach the exact audience most likely to buy from you', 'Appear on Facebook, Instagram, and WhatsApp', 'Track every rupee against real conversions'],
    overview: ['Facebook and Instagram reach people who are not actively searching but are exactly the right fit for your business. Meta ads put your offer in front of that audience and drive them to message, call, or buy.', 'We set up your ad account, pixel, and campaigns across Facebook, Instagram, and WhatsApp — with tracking in place so you know precisely what each rupee of spend returns.'],
    howItWorks: ['We set up your Meta Business account and tracking pixel.', 'We research your ideal audience and build targeting.', 'We create image and video ads for Feed, Stories, and Reels.', 'We launch campaigns and review performance with you.'],
    faqs: [{ question: 'How much ad budget do I need?', answer: 'Budgets are paid directly to Meta and can start small, scaling up as results come in.' }, { question: 'Which platforms do the ads run on?', answer: 'Facebook, Instagram, WhatsApp, and Messenger.' }, { question: 'Do I need a video for the ads?', answer: 'No, we can design image ads or use simple video formats.' }, { question: 'Can you target people near my business?', answer: 'Yes, we can target by location, interests, and behaviors.' }],
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
    description: 'A dedicated landing page, citations, and listings so you rank in the next city you want to win.',
    icon: 'MapPin',
    section: 'grow',
    details: 'Expand into the next city with a dedicated landing page, local listings, and citations so you rank where you want to win.',
    benefits: ['Win customers in the next city you want to grow into', 'Rank locally without opening a physical branch'],
    overview: ['If you are ready to win customers in a new city, you need more than a hope — you need a local presence there. This service builds a dedicated landing page and local listings so you rank in the next market you target.', 'We research that city’s search behavior, build a page tailored to it, and list your business locally, so customers there find you as easily as they find your competitors.'],
    howItWorks: ['We research the keywords and competitors in your target city.', 'We design and build a dedicated landing page for that city.', 'We set up local listings and citations for the new area.', 'We add local schema so search engines understand your coverage.'],
    faqs: [{ question: 'Can I target more than one city?', answer: 'Yes, we can build a presence across multiple cities over time.' }, { question: 'Do I need a physical office there?', answer: 'Not necessarily. Many service businesses rank in nearby cities without a branch.' }, { question: 'How is this different from my main website?', answer: 'It adds a dedicated page and listings optimized for the new city’s searches.' }, { question: 'How long until I rank in the new city?', answer: 'Local rankings build over weeks to months, depending on competition.' }],
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
    description: 'One person who knows your business, with monthly strategy calls and a quarterly review of what is working.',
    icon: 'UserCheck',
    section: 'care',
    details: 'Get one dedicated person who knows your business, with monthly strategy calls and quarterly reviews of what\'s working.',
    benefits: ['Have one person who truly knows your business', 'Stay on track with monthly strategy and clear reporting', 'Never wonder what is being done or why'],
    overview: ['When your marketing is split across many tools and people, it is easy to lose track of what is actually happening. A dedicated growth manager gives you one person who knows your business and keeps everything moving.', 'You get a single point of contact, regular strategy calls, and clear reporting — so you always know what is being done, why, and what is working.'],
    howItWorks: ['We assign a manager who learns your business and goals.', 'You get a priority channel for questions and requests.', 'You receive monthly strategy calls and performance reports.', 'We review progress quarterly and adjust the plan.'],
    faqs: [{ question: 'How is this different from normal support?', answer: 'You get one dedicated person with priority access and proactive strategy.' }, { question: 'How often do we talk?', answer: 'At least monthly, with weekly updates and a quarterly review.' }, { question: 'Can the manager coordinate with my team?', answer: 'Yes, they can work directly with your staff as needed.' }, { question: 'What if my needs change?', answer: 'Your manager adjusts the plan with you as your business evolves.' }],
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
    description: 'Unlimited content and page updates every month — change a phone number, add a page, swap a photo, no extra bills.',
    icon: 'RefreshCw',
    section: 'care',
    details: 'Make unlimited content and page updates every month — change a phone number, add a page, or swap a photo with no extra bills.',
    benefits: ['Keep your website accurate and current without extra bills', 'Make changes as fast as your business changes', 'No more waiting or surprise invoices for small edits'],
    overview: ['A website that says the wrong phone number or lists an outdated menu quietly costs you customers. Unlimited updates mean you never have to hesitate before asking for a change.', 'Change a price, add a page, swap a photo, or update your hours — whenever you need, with no surprise invoices at the end of the month.'],
    howItWorks: ['You send us the change you need through a simple channel.', 'We make the update and review it for accuracy.', 'We publish and test on every device.', 'You request more changes as often as needed.'],
    faqs: [{ question: 'Is it really unlimited?', answer: 'Yes, within fair use — normal content and page updates are unlimited each month.' }, { question: 'How fast are updates completed?', answer: 'Most simple changes are done within a business day or two.' }, { question: 'What counts as an update?', answer: 'Text, images, pages, hours, prices, and similar content changes.' }, { question: 'Can I do updates myself too?', answer: 'Yes, you keep access and can also make changes on your own.' }],
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
    description: 'Short-form reels and stories that show your business in motion and reach new audiences.',
    icon: 'Video',
    section: 'stay-active',
    details: 'Short-form reels and stories that show your business in motion and reach new audiences on Instagram and Facebook.',
    benefits: ['Reach new audiences with short-form video', 'Show your business in motion — not just static posts'],
    overview: ['Short-form video is the fastest-growing way to reach new customers. Reels and stories show your business in motion — the food being plated, the transformation, the behind-the-scenes — in a way static posts cannot.', 'We handle the ideas, editing, and posting, so your brand appears where people are watching, without you needing to be on camera every day.'],
    howItWorks: ['We brainstorm reel ideas and storyboards for your business.', 'We source footage and edit it into polished short videos.', 'We add music, captions, and on-brand graphics.', 'We schedule and post, then track engagement.'],
    faqs: [{ question: 'Do I need to appear in the videos?', answer: 'Not necessarily. We can use your products, space, or team footage.' }, { question: 'Where do you get the footage?', answer: 'From you, or licensed stock footage we source for you.' }, { question: 'How many reels do I get?', answer: 'We work to a monthly schedule agreed with you.' }, { question: 'Will reels help me reach new people?', answer: 'Yes, short video tends to reach beyond your existing followers.' }],
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
    description: 'Ongoing bid, keyword, and creative optimization so your ad spend keeps paying for itself.',
    icon: 'Search',
    section: 'grow',
    details: 'Ongoing bid, keyword, and creative optimization so your Google ad spend keeps paying for itself.',
    benefits: ['Keep your ad spend paying for itself', 'Improve results every week with ongoing optimization', 'Get a clear monthly view of performance'],
    overview: ['Launching ads is only the start. Without ongoing optimization, costs creep up and results slip as competitors change and search behavior shifts.', 'This service keeps your campaigns sharp every week — refining keywords, testing ads, and pruning waste — so your budget keeps working as hard as possible.'],
    howItWorks: ['We monitor your campaigns and search terms weekly.', 'We adjust bids and add negative keywords to cut waste.', 'We test new ad variations and refresh creatives.', 'We report performance and improvements monthly.'],
    faqs: [{ question: 'How much budget should I set?', answer: 'It depends on your market, but we recommend a monthly budget you are comfortable sustaining.' }, { question: 'Will you reduce my cost per lead?', answer: 'We continuously optimize to improve results and lower wasted spend.' }, { question: 'Do I still pay for the ad budget separately?', answer: 'Yes, ad spend is paid directly to Google.' }, { question: 'Can I see what you change?', answer: 'Yes, you get a monthly report of changes and performance.' }],
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
    description: 'Ongoing audience, creative, and budget optimization across Facebook, Instagram, and WhatsApp ads.',
    icon: 'Share2',
    section: 'grow',
    details: 'Ongoing audience, creative, and budget optimization across Facebook, Instagram, and WhatsApp ads.',
    benefits: ['Keep ads fresh and effective across Meta platforms', 'Stop wasting budget on the wrong audiences'],
    overview: ['Meta ad performance decays over time — audiences tire, creatives fatigue, and costs rise. Ongoing management keeps your Facebook and Instagram ads fresh and efficient.', 'We refresh creatives, refine audiences, and test new angles monthly, so your campaigns stay profitable instead of slowly losing steam.'],
    howItWorks: ['We review your campaigns and audience performance.', 'We refresh ad creatives and test new variations.', 'We adjust targeting and prune underperforming segments.', 'We report results and next steps monthly.'],
    faqs: [{ question: 'How often are ads refreshed?', answer: 'We refresh creatives and test new variations every month.' }, { question: 'Can you reduce my cost per result?', answer: 'Yes, ongoing testing and optimization aim to improve efficiency.' }, { question: 'Which platforms are covered?', answer: 'Facebook, Instagram, WhatsApp, and Messenger.' }, { question: 'Do I approve changes before they go live?', answer: 'We keep you informed, with major changes shared for approval.' }],
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
    description: 'A clear picture of what your competitors are doing — and the gaps you can own.',
    icon: 'BarChart3',
    section: 'grow',
    details: 'Get a clear picture of what your competitors are doing — and the gaps you can own.',
    benefits: ['Understand exactly what your competitors are doing', 'Find the gaps you can own and win'],
    overview: ['You cannot beat competitors you do not understand. A competitor analysis shows you exactly what they are doing online — where they are strong, where they are weak, and where you can win.', 'We audit their websites, ads, and visibility, then translate the findings into clear opportunities your business can act on.'],
    howItWorks: ['We identify your top competitors in the market.', 'We audit their websites, ads, and online presence.', 'We map their strengths, weaknesses, and gaps.', 'We deliver a report with clear recommendations.'],
    faqs: [{ question: 'How many competitors do you analyze?', answer: 'Typically your top three, or more if your market needs it.' }, { question: 'What do I do with the report?', answer: 'It gives you a clear list of opportunities and gaps to act on.' }, { question: 'Is this a one-time analysis?', answer: 'Yes, though it can be repeated as your market changes.' }, { question: 'Do you implement the recommendations too?', answer: 'We can, as part of our other marketing services.' }],
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
    description: 'A priority support queue with a 2-hour response time so nothing waits.',
    icon: 'Zap',
    section: 'care',
    details: 'Jump the queue with priority support and a 2-hour response time so nothing waits.',
    benefits: ['Get answers in hours, not days', 'Keep your business moving without waiting on support'],
    overview: ['When something on your website breaks or a customer is waiting, hours feel like days. Priority support puts your requests at the front of the queue with a guaranteed fast response.', 'This is for businesses that cannot afford to wait — you get a direct line and a response-time commitment that keeps your business moving.'],
    howItWorks: ['Your requests are routed to a priority support queue.', 'You get a guaranteed fast response during business hours.', 'Urgent issues are escalated to the right people immediately.', 'You stay informed until the issue is resolved.'],
    faqs: [{ question: 'What is the response time?', answer: 'We commit to responding within two hours during business hours.' }, { question: 'What counts as urgent?', answer: 'Anything affecting your website being down or customers being unable to reach you.' }, { question: 'Is this available outside business hours?', answer: 'Business-hours priority is standard, with escalation options available.' }, { question: 'Can my team use this too?', answer: 'Yes, your whole team can route requests through the priority channel.' }],
    items: [
      _f('Priority queue in support system'),
      _m('2-hr response SLA (biz hrs)', 500),
      _mc('Emergency hotline routing', 100, 40, 1000),
    ],
  },

  {
    id: 'scale-multi',
    label: 'Multi-location',
    description: 'Set up and manage your presence across multiple locations, each with its own listing and page.',
    icon: 'Building',
    section: 'get-found',
    details: 'Set up and manage your presence across multiple locations, each with its own listing and page.',
    benefits: ['Manage every location consistently from one place', 'Win customers in every area you serve'],
    overview: ['If your business serves several locations, you need a presence in each one. Multi-location management sets up and maintains a Google profile and landing page for every branch or service area.', 'This keeps your listings consistent and your brand strong everywhere you operate, so customers in each area can find and trust you.'],
    howItWorks: ['We set up a Google Business Profile for each location.', 'We build a landing page for every location or area.', 'We add local citations and schema for each.', 'We keep listings consistent and updated.'],
    faqs: [{ question: 'How many locations can I manage?', answer: 'As many as you operate, each with its own profile and page.' }, { question: 'Do I need a separate website for each?', answer: 'No, dedicated landing pages on your existing site work well.' }, { question: 'Will this hurt my main website’s rankings?', answer: 'No, when done correctly it strengthens your overall local presence.' }, { question: 'Can you update listings as locations change?', answer: 'Yes, we keep every listing accurate as your business grows.' }],
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
    description: 'A professional email that matches your domain. No more Gmail for business.',
    icon: 'Mail',
    section: 'build',
    details: 'Get a professional email that matches your domain — no more Gmail for business — with everything configured and authenticated.',
    benefits: ['Look professional with an email that matches your domain', 'Build trust that a free Gmail address can\'t'],
    overview: ['A business email on your own domain — like hello@yourbusiness.com — signals professionalism in a way a free Gmail address never can. Customers and partners take you more seriously.', 'We set up your professional email, connect it to your domain, and configure it so your messages are authenticated and less likely to land in spam.'],
    howItWorks: ['We create your email account on your domain.', 'We verify the domain and configure the mail records.', 'We add authentication so your emails are trusted.', 'We help you set it up on your phone and computer.'],
    faqs: [{ question: 'Why do I need a domain email?', answer: 'It builds trust and protects your brand, unlike a free personal address.' }, { question: 'Can I have multiple email addresses?', answer: 'Yes, you can have addresses for different roles or team members.' }, { question: 'Will my emails go to spam?', answer: 'We configure authentication to maximize deliverability.' }, { question: 'Which email provider do you use?', answer: 'A reliable business provider, set up and managed for you.' }],
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
    description: 'A 1–2 hour session that teaches your team to reply, post, and manage everything themselves.',
    icon: 'Users',
    section: 'care',
    details: 'A 1–2 hour session that teaches your team to reply, post, and manage everything themselves.',
    benefits: ['Empower your team to manage things themselves', 'Reduce dependence on outside help for daily tasks'],
    overview: ['Your team is on the front line of your digital presence — replying on WhatsApp, posting updates, and managing enquiries. A short training session gives them the confidence to do it well.', 'We walk your staff through the tools they use every day, share ready-made reply templates, and leave behind a quick-reference guide so nothing is forgotten.'],
    howItWorks: ['We understand which tools your team uses day to day.', 'We prepare guides and reply templates for each one.', 'We deliver a live 1–2 hour hands-on session.', 'We leave a cheat sheet your team can refer to later.'],
    faqs: [{ question: 'How long is the training?', answer: 'One to two hours, focused on your team’s actual daily tools.' }, { question: 'Is it in person or online?', answer: 'Online works well, and in person can be arranged if you are local.' }, { question: 'What do we get to keep?', answer: 'Guides, templates, and a quick-reference cheat sheet.' }, { question: 'Can we record the session?', answer: 'Yes, so new staff can watch it later.' }],
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
    description: 'A professional logo and brand colors you will be proud to show — three concepts, refined until you love it.',
    icon: 'Palette',
    section: 'build',
    details: 'A professional logo and brand identity you\'ll be proud to show — three concepts, refined until you love it.',
    benefits: ['Look established and memorable across every touchpoint', 'Build instant recognition and trust'],
    overview: ['Your logo and brand are the first impression customers have of your business. A consistent, professional identity makes you memorable and trustworthy across your website, social media, and print.', 'We design a logo and brand system — colors, fonts, and variations — so every asset you produce looks like it belongs to one confident, established business.'],
    howItWorks: ['We learn about your business, customers, and style preferences.', 'We design three logo concepts for you to choose from.', 'You pick a direction and we refine it with revisions.', 'We deliver the full brand kit with guidelines.'],
    faqs: [{ question: 'How many logo concepts do I get?', answer: 'Three distinct concepts, refined with revisions until you love it.' }, { question: 'Do I own the final logo?', answer: 'Yes, you get full rights and all the source files.' }, { question: 'What files do I receive?', answer: 'Everything you need — from high-resolution formats to web and social sizes.' }, { question: 'Can I request changes?', answer: 'Yes, revisions are included until the identity feels right.' }],
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
    description: 'A designed brochure or catalog PDF, optimized to share on WhatsApp and look great on phones.',
    icon: 'FileText',
    section: 'build',
    details: 'A designed brochure or catalog PDF, optimized to share on WhatsApp and look great on phones.',
    benefits: ['Share a polished brochure on WhatsApp in seconds', 'Present your services professionally on any phone'],
    overview: ['A polished brochure makes your business look established and gives customers something concrete to remember you by. When it is optimized for WhatsApp, you can share it with anyone in seconds.', 'We design a clean, professional brochure or catalog PDF that reads beautifully on a phone — the way most customers will actually see it.'],
    howItWorks: ['We gather your services, story, and contact details.', 'We write and design a clean, branded layout.', 'You review and we refine the design.', 'We export a phone-friendly PDF ready to share.'],
    faqs: [{ question: 'How many pages is the brochure?', answer: 'Typically a four-page layout, with more pages available if needed.' }, { question: 'Will it look good on WhatsApp?', answer: 'Yes, it is optimized and compressed to look sharp on phones.' }, { question: 'Do I need to provide photos?', answer: 'We can use yours or source licensed images for you.' }, { question: 'Can I update it later?', answer: 'Yes, we can revise the design whenever your services change.' }],
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
    description: 'An order form that drops straight into WhatsApp, so customers order without a single phone call.',
    icon: 'ShoppingCart',
    section: 'automate',
    details: 'An online order form that drops straight into WhatsApp, so customers order without a single phone call.',
    benefits: ['Let customers order without a single phone call', 'Capture orders straight into WhatsApp'],
    overview: ['Every phone call you skip is time saved and a sale made faster. An online ordering page lets customers choose what they want and send the order straight to your WhatsApp — no call required.', 'It works for restaurants, boutiques, home kitchens, and any business that takes orders. Customers fill a simple form and you receive a complete, readable order instantly.'],
    howItWorks: ['We design a simple order form for your products or menu.', 'We connect the form to your WhatsApp.', 'Customers fill in their details and order.', 'You receive the order and confirm directly.'],
    faqs: [{ question: 'Do customers need an account?', answer: 'No, they simply fill the form and send it.' }, { question: 'Can I customize the fields?', answer: 'Yes, we tailor the form to exactly what you need to know.' }, { question: 'Does it take payments?', answer: 'Orders are sent to WhatsApp, with payment links available if you want.' }, { question: 'How do I receive orders?', answer: 'They arrive in your WhatsApp, ready to confirm.' }],
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
    description: 'A branded newsletter template, subscriber list import, and welcome automation — ready to send.',
    icon: 'Mail',
    section: 'automate',
    details: 'Set up branded email marketing with a newsletter template, subscriber import, and welcome automation — ready to send.',
    benefits: ['Start email marketing with a professional, branded setup', 'Automate welcome emails so no subscriber goes cold'],
    overview: ['Email is one of the highest-return marketing channels, because you own the list and reach customers directly. Getting the setup right means every send looks professional and lands in the inbox.', 'We set up your platform, build a branded newsletter template, import your list, and create a welcome automation — so you are ready to send from day one.'],
    howItWorks: ['We set up your email platform and verify your sending domain.', 'We design a branded newsletter template.', 'We import and organize your subscriber list.', 'We build a welcome automation and signup form.'],
    faqs: [{ question: 'Which platform do you use?', answer: 'A popular, affordable provider like Brevo or Mailchimp.' }, { question: 'Do I need my own email list?', answer: 'We can import your existing list and help you grow it.' }, { question: 'Will my emails land in spam?', answer: 'We configure authentication and best practices to maximize delivery.' }, { question: 'Can I send campaigns myself?', answer: 'Yes, we set it up and show you how to use it.' }],
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
    description: 'Monthly campaigns, A/B testing, and re-engagement that keep your list warm and buying.',
    icon: 'Mail',
    section: 'automate',
    details: 'Monthly email campaigns, A/B testing, and re-engagement that keep your list warm and buying.',
    benefits: ['Keep your list warm and buying every month', 'Reach customers directly without relying on ads'],
    overview: ['A warm email list is an asset that pays you every month. Regular, well-written campaigns keep your business top-of-mind and bring customers back without paying for ads.', 'We handle the monthly sending, testing, and optimization — so your list stays engaged and your offers keep producing sales.'],
    howItWorks: ['We plan your monthly campaign calendar.', 'We write and design each campaign.', 'We test subject lines and optimize send times.', 'We report opens, clicks, and sales monthly.'],
    faqs: [{ question: 'How many campaigns do you send?', answer: 'Two to four campaigns a month, depending on your plan.' }, { question: 'Do you write the content?', answer: 'Yes, copywriting and design are included.' }, { question: 'Can you handle seasonal offers?', answer: 'Yes, we plan campaigns around your sales calendar.' }, { question: 'How do I measure success?', answer: 'We report opens, clicks, and resulting enquiries monthly.' }],
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
    description: 'Appointment reminders, offers, and alerts delivered by SMS — with DND compliance handled.',
    icon: 'Send',
    section: 'automate',
    details: 'Send appointment reminders, offers, and alerts by SMS — with DND and TRAI compliance handled for you.',
    benefits: ['Cut no-shows with appointment reminders', 'Reach customers instantly with offers and alerts'],
    overview: ['SMS is the fastest way to reach a customer — most messages are read within minutes. Appointment reminders cut no-shows, and offers reach customers wherever they are.', 'We handle the compliance side too, so your messages follow India’s DND and TRAI rules and reach customers without landing you in trouble.'],
    howItWorks: ['We set up your SMS platform and register your templates.', 'We ensure DND and TRAI compliance.', 'We build templates for reminders, offers, and alerts.', 'We schedule campaigns and report delivery.'],
    faqs: [{ question: 'Is SMS marketing legal in India?', answer: 'Yes, with DND and TRAI compliance, which we handle for you.' }, { question: 'What does it cost to send SMS?', answer: 'SMS credits are billed separately per message, typically a few paise each.' }, { question: 'Can I send appointment reminders?', answer: 'Yes, reminders are one of the most effective uses of SMS.' }, { question: 'Can customers opt out?', answer: 'Yes, every message includes a clear opt-out option.' }],
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
    description: 'Fresh, SEO-friendly blog posts that build authority and keep your site climbing.',
    icon: 'PenLine',
    section: 'stay-active',
    details: 'Fresh, SEO-friendly blog posts that build authority and keep your website climbing.',
    benefits: ['Build authority and climb search rankings with fresh content', 'Give customers helpful answers that earn trust'],
    overview: ['Every helpful blog post is a new page that can rank on Google and earn customer trust. Consistent, SEO-friendly content builds your authority and keeps your website climbing.', 'We research topics your customers actually search for, write the articles, and publish them — so your site grows steadily without you having to write a word.'],
    howItWorks: ['We research topics and keywords worth targeting.', 'We write clear, useful articles for your audience.', 'We optimize each post for search engines.', 'We publish and report performance.'],
    faqs: [{ question: 'How many posts do I get?', answer: 'Two to four posts a month, depending on your plan.' }, { question: 'Do I need to provide topics?', answer: 'No, we research topics, but your suggestions are welcome.' }, { question: 'Will blogging help me rank?', answer: 'Yes, over time fresh, relevant content builds authority and rankings.' }, { question: 'Who writes the content?', answer: 'We write it in your brand voice, reviewed before publishing.' }],
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
    description: 'A scannable QR menu plus UPI payment and WhatsApp links — print-ready for tables and counters.',
    icon: 'QrCode',
    section: 'automate',
    details: 'A scannable QR menu with UPI payment and WhatsApp links — print-ready for tables and counters.',
    benefits: ['Let customers order and pay by scanning a QR code', 'Reduce wait times and manual order-taking'],
    overview: ['A single QR code can replace a printed menu, a payment terminal, and a phone call. Customers scan, browse your menu, pay via UPI, or chat on WhatsApp — all without a single step from your staff.', 'We build a mobile-friendly menu page and generate print-ready QR codes for tables, counters, and packaging.'],
    howItWorks: ['We design a mobile-friendly menu or service page.', 'We generate QR codes for menu, UPI payment, and WhatsApp.', 'We prepare print-ready posters and table stands.', 'You print and place them where customers can scan.'],
    faqs: [{ question: 'What can customers do with the QR code?', answer: 'View your menu, pay by UPI, or message you on WhatsApp.' }, { question: 'Can I update the menu later?', answer: 'Yes, digital menus can be updated anytime without reprinting.' }, { question: 'Do I get print-ready files?', answer: 'Yes, we deliver posters and table stands ready to print.' }, { question: 'Do customers need an app to scan?', answer: 'No, any phone camera can scan a QR code.' }],
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
    description: 'Ready-made festive campaigns — social posts, emails, and WhatsApp broadcasts for Diwali, Holi, and New Year.',
    icon: 'Sparkles',
    section: 'grow',
    details: 'Ready-made festive campaigns for Diwali, Holi, and New Year — social posts, emails, and WhatsApp broadcasts.',
    benefits: ['Capture seasonal demand when customers are ready to buy', 'Run ready-made campaigns without the busy-work'],
    overview: ['Festive seasons are when customers are most ready to spend — and when competitors fight hardest for attention. A ready-made campaign lets you capture that demand without the last-minute scramble.', 'We design a complete festive campaign for Diwali, Holi, or New Year, with social posts, emails, and WhatsApp broadcasts that feel cohesive and on-brand.'],
    howItWorks: ['We design a festive theme for your brand.', 'We create social posts, email, and WhatsApp creatives.', 'You approve the campaign and offers.', 'We schedule and launch it across channels.'],
    faqs: [{ question: 'Which festivals do you cover?', answer: 'Diwali, Holi, New Year, and other key seasons on request.' }, { question: 'How long does it take?', answer: 'We plan ahead so your campaign is ready before the season starts.' }, { question: 'Can you include a special offer?', answer: 'Yes, we design creatives around your offers and discounts.' }, { question: 'Do you run the campaigns too?', answer: 'We prepare everything and can schedule the sends for you.' }],
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
    description: 'A booking page with time slots and automatic confirmations, so customers book without phone tag.',
    icon: 'Calendar',
    section: 'automate',
    details: 'A booking page with time slots and automatic confirmations, so customers book without phone tag.',
    benefits: ['End phone-tag and double bookings', 'Let customers book at any hour, automatically'],
    overview: ['Phone tag and double bookings cost you customers every week. An online booking page lets clients see your availability and book themselves — with automatic confirmations to both of you.', 'It works for salons, clinics, consultants, and any business that runs on appointments, freeing your staff to focus on serving rather than scheduling.'],
    howItWorks: ['We build a branded booking page with your services.', 'We configure your time slots and availability.', 'Customers book and receive automatic confirmations.', 'Bookings sync to your calendar instantly.'],
    faqs: [{ question: 'Can customers reschedule or cancel?', answer: 'Yes, we can enable self-service rescheduling and cancellation.' }, { question: 'Will it sync with my calendar?', answer: 'Yes, bookings sync with Google Calendar.' }, { question: 'Do I get notified of new bookings?', answer: 'Yes, via WhatsApp or email instantly.' }, { question: 'Can I set different services with different durations?', answer: 'Yes, each service can have its own duration and pricing.' }],
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
    description: 'A 24/7 AI assistant on WhatsApp and your website that answers FAQs and hands off to a human.',
    icon: 'Bot',
    section: 'automate',
    details: 'A 24/7 AI assistant on WhatsApp and your website that answers FAQs and hands off to a human when needed.',
    benefits: ['Answer every customer instantly, 24/7', 'Free your team from repetitive FAQs'],
    overview: ['Your customers ask the same questions every day — prices, hours, directions, availability. An AI chatbot answers them instantly on WhatsApp and your website, at any hour, so no enquiry ever goes unanswered.', 'When a question is too complex, the bot hands off to a human seamlessly, so you get the speed of automation without losing the personal touch.'],
    howItWorks: ['We build a knowledge base from your FAQs and services.', 'We set up a 24/7 auto-reply flow on WhatsApp and your site.', 'We tune the bot’s tone to match your brand.', 'We review conversations monthly and refine the answers.'],
    faqs: [{ question: 'Will the bot sound human?', answer: 'Yes, we tune its tone and responses to feel natural and on-brand.' }, { question: 'Can it take bookings or orders?', answer: 'Yes, it can guide customers through simple booking or ordering flows.' }, { question: 'What happens when it cannot answer?', answer: 'It hands off to a real person so no lead is lost.' }, { question: 'Do I need to train it myself?', answer: 'No, we set it up and keep it tuned for you.' }],
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
    description: 'AI-assisted blogs, captions, and emails written in your brand voice — human-reviewed before publishing.',
    icon: 'Wand2',
    section: 'stay-active',
    details: 'AI-assisted blogs, captions, and emails written in your brand voice — human-reviewed before publishing.',
    benefits: ['Publish consistent content without hiring a writer', 'Keep your brand voice human-reviewed and on-point'],
    overview: ['Consistent content grows your business, but writing it takes time you do not have. AI-assisted content produces blogs, captions, and emails quickly — then a human reviews everything before it goes live.', 'You get the speed of AI with the quality control of a real editor, all written in your brand’s voice.'],
    howItWorks: ['We set up your brand voice and style guide.', 'We generate drafts for blogs, captions, and emails.', 'A human reviews and polishes each piece.', 'We publish and track performance.'],
    faqs: [{ question: 'Is the content original?', answer: 'Yes, each piece is generated and then edited to be unique and on-brand.' }, { question: 'Does a human review everything?', answer: 'Yes, nothing is published without human review.' }, { question: 'Can it match my brand’s tone?', answer: 'Yes, we configure it to write in your voice.' }, { question: 'What formats can you produce?', answer: 'Blogs, social captions, email drafts, and meta descriptions.' }],
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
    description: 'Auto-replies to every review with a monthly sentiment summary, so nothing goes unanswered.',
    icon: 'Star',
    section: 'get-found',
    details: 'Auto-reply to every review with a monthly sentiment summary, so no customer feedback goes unanswered.',
    benefits: ['Never leave a review unanswered', 'See how customers feel at a glance each month'],
    overview: ['Every review deserves a response, but monitoring every platform and replying promptly is hard. An AI review manager watches for new reviews and drafts appropriate replies automatically.', 'You never leave a customer unanswered, and a monthly sentiment summary shows you at a glance how customers feel about your business.'],
    howItWorks: ['We monitor Google, Facebook, and other review platforms.', 'The AI drafts a fitting reply to every review.', 'You approve replies, or let them post automatically.', 'You get a monthly summary of customer sentiment.'],
    faqs: [{ question: 'Will replies sound automatic?', answer: 'No, they are tailored to each review and tuned to your tone.' }, { question: 'Do I approve replies before they post?', answer: 'You can choose to approve first or allow automatic posting.' }, { question: 'Which platforms are covered?', answer: 'Google, Facebook, and other major review sites.' }, { question: 'What does the monthly summary show?', answer: 'Overall sentiment, common themes, and areas to improve.' }],
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
    description: 'A WhatsApp assistant that asks the right questions, scores leads, and pings you the hot ones instantly.',
    icon: 'Filter',
    section: 'grow',
    details: 'A WhatsApp assistant that asks the right questions, scores leads, and pings you the hot ones instantly.',
    benefits: ['Know which leads are hot the moment they arrive', 'Stop chasing cold leads'],
    overview: ['Not every enquiry is a customer worth chasing. An AI lead qualifier asks the right questions on WhatsApp, scores each lead, and pings you instantly when a hot one arrives.', 'You stop wasting time on tire-kickers and focus your energy on the leads most likely to buy.'],
    howItWorks: ['We build a qualification script around your sales process.', 'The assistant asks about budget, timeline, and requirements.', 'Each lead is scored hot, warm, or cold.', 'Hot leads notify you on WhatsApp immediately.'],
    faqs: [{ question: 'What questions does it ask?', answer: 'The ones that matter to your sales process — budget, timeline, and needs.' }, { question: 'How do I know which leads are hot?', answer: 'Hot leads trigger an instant WhatsApp notification to you.' }, { question: 'Can I customize the scoring?', answer: 'Yes, we tune the rules to what makes a lead valuable to you.' }, { question: 'Does it work with my existing WhatsApp?', answer: 'Yes, it runs on your business WhatsApp.' }],
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
    description: 'Studio-quality product photos generated without a photoshoot — background, lighting, and edits done for you.',
    icon: 'Image',
    section: 'stay-active',
    details: 'Studio-quality product photos generated without a photoshoot — background, lighting, and edits handled for you.',
    benefits: ['Get studio-quality product photos without a photoshoot', 'Make your catalog look premium and professional'],
    overview: ['Professional product photos used to require a studio, a photographer, and days of work. AI product photography creates studio-quality images of your products without any of that.', 'We generate clean, on-brand images with the right background and lighting, then polish them so your catalog looks premium everywhere it appears.'],
    howItWorks: ['We guide you on capturing a few simple photos of each product.', 'AI generates studio-quality backgrounds and lighting.', 'We edit, color-correct, and resize each image.', 'You receive web- and social-ready images.'],
    faqs: [{ question: 'Do I need professional equipment?', answer: 'No, a phone photo is usually enough to start.' }, { question: 'How many photos can I get?', answer: 'We work in batches, typically around ten per run.' }, { question: 'Can you match my brand style?', answer: 'Yes, we tailor backgrounds and tone to your brand.' }, { question: 'Are the images high resolution?', answer: 'Yes, they are suitable for web and social media.' }],
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
    description: 'Dashboards, CRMs, and internal tools built to your exact workflow.',
    icon: 'Code',
    section: 'custom-software',
    details: 'Dashboards, CRMs, and internal tools built to your exact workflow — from discovery to deployment and support.',
    benefits: ['Get software built around your exact workflow', 'Automate the busy-work eating your team\'s time'],
    overview: ['Off-the-shelf software forces your business to work the tool’s way. Custom software does the opposite — it is built around your exact workflow, from the screens your team uses to the reports you need.', 'Whether it is a dashboard, CRM, or internal tool, we take it from discovery to launch, then train your team and support you after go-live.'],
    howItWorks: ['We run a discovery session to map your workflow and goals.', 'We design screens and get your feedback before building.', 'We build, test, and refine the software iteratively.', 'We launch, train your team, and support you afterwards.'],
    faqs: [{ question: 'How long does custom software take?', answer: 'It depends on scope, but we agree a timeline during discovery.' }, { question: 'How is the price determined?', answer: 'Pricing is quote-based, estimated from your requirements.' }, { question: 'Do I own the software?', answer: 'Yes, the software is built for your business.' }, { question: 'What happens after launch?', answer: 'We provide training and support to keep things running smoothly.' }],
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
    description: 'GST invoices, payment tracking, and recurring billing — with UPI links on every invoice.',
    icon: 'Receipt',
    section: 'custom-software',
    details: 'GST invoices, payment tracking, and recurring billing with UPI links on every invoice.',
    benefits: ['Send GST-compliant invoices and get paid faster', 'See who owes what at a glance'],
    overview: ['Getting paid on time starts with clear, professional invoices. A billing system generates GST-compliant invoices, tracks payments, and sends reminders automatically.', 'You always know who owes what, and customers can pay instantly with a UPI link on every invoice.'],
    howItWorks: ['We build your invoice templates with GST details.', 'You create customers and items once.', 'Invoices go out with UPI payment links.', 'Payments are tracked and reported automatically.'],
    faqs: [{ question: 'Are the invoices GST-compliant?', answer: 'Yes, with CGST, SGST, and IGST breakdowns.' }, { question: 'Can customers pay online?', answer: 'Yes, every invoice includes a UPI payment link.' }, { question: 'Can I handle recurring billing?', answer: 'Yes, for subscriptions and retainers.' }, { question: 'What reports do I get?', answer: 'Revenue, outstanding amounts, and GST summaries.' }],
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
    description: 'Track stock in and out, get low-stock alerts, and manage suppliers from one place.',
    icon: 'Boxes',
    section: 'custom-software',
    details: 'Track stock in and out, get low-stock alerts, and manage suppliers from one place.',
    benefits: ['Never run out of stock without knowing', 'Track everything in one place'],
    overview: ['Running out of stock — or losing track of what you have — costs you sales and money. Inventory management tracks stock in and out, alerts you before you run low, and organizes your suppliers.', 'You get a single, clear view of everything you carry, so ordering and planning become easy.'],
    howItWorks: ['We set up your product catalog with prices and categories.', 'Stock movements are recorded in and out.', 'You receive alerts when items run low.', 'Reports show stock value and movement.'],
    faqs: [{ question: 'Can I track multiple locations?', answer: 'Yes, we can set up tracking across warehouses or branches.' }, { question: 'Will I get low-stock alerts?', answer: 'Yes, you set the threshold and we alert you.' }, { question: 'Can I import my existing products?', answer: 'Yes, we can import from Excel or CSV.' }, { question: 'Does it support barcodes?', answer: 'Yes, barcode and QR scanning can be included.' }],
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
    description: 'Clock-in/out, shift and leave management, and salary calculation for your team.',
    icon: 'Users',
    section: 'custom-software',
    details: 'Clock-in/out, shift and leave management, and salary calculation for your team.',
    benefits: ['End attendance disputes with clear records', 'Calculate salaries accurately in minutes'],
    overview: ['Attendance disputes and manual salary math waste hours every month. A staff attendance system records clock-ins and clock-outs, tracks leave, and calculates salaries automatically.', 'You get accurate records and payroll-ready summaries, so you spend less time on admin and more on your business.'],
    howItWorks: ['We set up staff profiles and shifts.', 'Staff clock in and out via web or QR code.', 'Leave and holidays are tracked automatically.', 'Salaries are calculated and exported for payroll.'],
    faqs: [{ question: 'How do staff clock in?', answer: 'Via a web page or QR code scan.' }, { question: 'Can I track late arrivals?', answer: 'Yes, reports show punctuality and hours worked.' }, { question: 'Does it calculate salaries?', answer: 'Yes, based on hours, shifts, and leave.' }, { question: 'Can I export to Excel?', answer: 'Yes, payroll summaries export to Excel.' }],
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
    description: 'Points, punch cards, and referral rewards that turn one-time buyers into regulars.',
    icon: 'Gift',
    section: 'custom-software',
    details: 'Points, punch cards, and referral rewards that turn one-time buyers into regulars.',
    benefits: ['Turn one-time buyers into regulars', 'Encourage referrals that grow your customer base'],
    overview: ['It costs far less to keep a customer than to win a new one. A loyalty program rewards repeat purchases and referrals, turning one-time buyers into regulars who bring their friends.', 'Points, punch cards, and referral rewards run automatically, so your customers feel valued without adding work to your team.'],
    howItWorks: ['We set up a points or punch-card system for your business.', 'Customers earn rewards with every purchase or visit.', 'Referrals earn bonuses for both sides.', 'Rewards and redemptions are tracked automatically.'],
    faqs: [{ question: 'What kind of rewards work best?', answer: 'Points, punch cards, and referral bonuses are the most common.' }, { question: 'Can customers track their points?', answer: 'Yes, they get notified of their balance and rewards.' }, { question: 'Will it work with my existing billing?', answer: 'Yes, we can integrate it with your sales flow.' }, { question: 'Can I set member tiers?', answer: 'Yes, tiers like silver, gold, and platinum are supported.' }],
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
    description: 'Order status from placed to delivered, with live customer links and WhatsApp updates.',
    icon: 'Truck',
    section: 'custom-software',
    details: 'Order status from placed to delivered, with live customer links and WhatsApp updates.',
    benefits: ['Give customers live visibility into their orders', 'Reduce \'where is my order\' calls'],
    overview: ['The most common customer question after an order is "where is my delivery?" A tracking system answers it automatically, with live status and WhatsApp updates.', 'Customers see their order move from placed to out-for-delivery to delivered — and you stop fielding the same call all day.'],
    howItWorks: ['We set up your order status flow.', 'Orders are assigned to drivers or couriers.', 'Customers get a live tracking link.', 'Status updates send automatically via WhatsApp.'],
    faqs: [{ question: 'Do customers need an app?', answer: 'No, they track through a simple link.' }, { question: 'Can drivers update status?', answer: 'Yes, drivers update progress and customers see it live.' }, { question: 'Will customers get WhatsApp updates?', answer: 'Yes, at each stage of the delivery.' }, { question: 'Can I see delivery performance?', answer: 'Yes, analytics show delivery times and trends.' }],
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
    description: 'Membership plans, renewals, and payment collection with automatic expiry reminders.',
    icon: 'Award',
    section: 'custom-software',
    details: 'Membership plans, renewals, and payment collection with automatic expiry reminders.',
    benefits: ['Collect renewals automatically without chasing', 'Keep members engaged with reminders'],
    overview: ['Memberships create predictable revenue and loyal customers. A membership system handles plans, renewals, and payments — with automatic reminders before anything expires.', 'You stop chasing renewals manually and keep members engaged with timely, automatic reminders.'],
    howItWorks: ['We set up your membership plans and pricing.', 'Members sign up and manage their profiles.', 'Renewal and expiry reminders send automatically.', 'Payments are collected with UPI links.'],
    faqs: [{ question: 'What membership plans can I offer?', answer: 'Monthly, quarterly, or annual plans, plus custom tiers.' }, { question: 'Are renewals automatic?', answer: 'Reminders are automatic, with payment links for easy renewal.' }, { question: 'Can I track attendance or usage?', answer: 'Yes, for gyms and clubs we can track visits.' }, { question: 'What reports are available?', answer: 'Membership counts, renewals, and revenue reports.' }],
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
  return Object.values(_serviceMap).map((svc) => ({
    id: svc.id,
    label: svc.label,
    description: svc.description ?? '',
    icon: svc.icon ?? 'FileText',
    section: svc.section ?? 'build',
    stage: svc.stage,
    details: svc.details ?? '',
    benefits: svc.benefits ?? [],
    overview: svc.overview ?? [],
    howItWorks: svc.howItWorks ?? [],
    faqs: svc.faqs ?? [],
  }))
}
