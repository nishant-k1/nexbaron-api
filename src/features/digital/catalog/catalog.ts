export type BillingType = 'oneTime' | 'monthly'

export type ServiceStage = 'design' | 'build' | 'setup'

export interface CatalogService {
  id: string
  label: string
  type: BillingType
  oneTime?: { cost: number; selling: number }
  monthly?: { cost: number; selling: number }
  unitLabel?: string
  deliverDays?: number
  parallel?: boolean
  stage?: ServiceStage
}

export interface CatalogPlan {
  id: string
  name: string
  oneTime: number
  monthly: number
  monthlyName: string
  tagline: string
  timeline: string
  icon: string
  featured?: boolean
  inherited?: { label: string; oneTime: number; monthly: number }
  services: CatalogService[]
  addOns: CatalogService[]
  ctaLabel: string
  timelineMode?: 'phased'
  foundationDays?: number
  expectations?: { label: string; note: string }[]
  minimumMonths?: number
  annualMonthly?: number
}

export interface DigitalCatalog {
  version: string
  updatedAt: string
  currency: 'INR'
  plans: CatalogPlan[]
}

const customPlan: CatalogPlan = {
  id: 'custom',
  name: 'Custom',
  oneTime: 0,
  monthly: 0,
  monthlyName: '',
  tagline: 'Not finding what you need? Let\'s build it together.',
  icon: 'MessageSquare',
  timeline: 'We\'ll scope and quote within 2 days',
  services: [
    { id: 'custom-mix', label: 'Pick services from any plan', type: 'oneTime' },
    { id: 'custom-new', label: 'Request services not listed above', type: 'oneTime' },
    { id: 'custom-quote', label: 'Receive a custom quote within 48h', type: 'oneTime' },
  ],
  addOns: [],
  ctaLabel: 'Contact Us',
}

export const digitalCatalog: DigitalCatalog = {
  version: '3.0.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  currency: 'INR',
  plans: [
    {
      id: 'launch',
      name: 'Launch',
      oneTime: 4999,
      monthly: 1149,
      monthlyName: 'Care',
      tagline: 'A professional website for your business.',
      icon: 'Rocket',
      timeline: 'Live in 2–3 days',
      services: [
        { id: 'website', label: 'Website — Up to 5 Pages', type: 'oneTime', oneTime: { cost: 1500, selling: 2500 }, monthly: { cost: 400, selling: 575 }, deliverDays: 1, stage: 'build' },
        { id: 'whatsapp', label: 'WhatsApp Chat Button', type: 'oneTime', oneTime: { cost: 200, selling: 499 }, monthly: { cost: 50, selling: 115 }, deliverDays: 0, stage: 'build' },
        { id: 'maps', label: 'Google Maps Business Listing', type: 'oneTime', oneTime: { cost: 600, selling: 1000 }, monthly: { cost: 100, selling: 230 }, deliverDays: 0.5, stage: 'setup' },
        { id: 'gbp', label: 'Google Business Profile — Setup & Verify', type: 'oneTime', oneTime: { cost: 400, selling: 500 }, monthly: { cost: 113, selling: 115 }, deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'analytics', label: 'Visit Analytics', type: 'oneTime', oneTime: { cost: 400, selling: 500 }, monthly: { cost: 100, selling: 114 }, deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'launch-pages', label: 'Extra pages', type: 'oneTime', oneTime: { cost: 0, selling: 299 }, unitLabel: 'per page', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-photos', label: 'Additional photos', type: 'oneTime', oneTime: { cost: 0, selling: 199 }, deliverDays: 0.25, stage: 'build' },
        { id: 'launch-domain', label: 'Domain setup', type: 'oneTime', oneTime: { cost: 0, selling: 499 }, deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Launch',
      minimumMonths: 3,
      annualMonthly: 999,
    },
    {
      id: 'growth',
      name: 'Growth',
      oneTime: 7999,
      monthly: 5499,
      monthlyName: 'Growth Care',
      tagline: 'Get found on Google and booked on WhatsApp.',
      icon: 'TrendingUp',
      timeline: 'Live in 2–3 days · ranking builds over 4–8 weeks',
      featured: true,
      inherited: { label: 'Everything in Launch', oneTime: 4999, monthly: 1149 },
      services: [
        { id: 'gbp-optimise', label: 'Google Business Profile — Optimize & Rank', type: 'oneTime', oneTime: { cost: 500, selling: 1200 }, monthly: { cost: 800, selling: 1200 }, deliverDays: 0.5, stage: 'setup' },
        { id: 'local-seo', label: 'Local SEO — Google Maps Ranking', type: 'oneTime', oneTime: { cost: 300, selling: 500 }, monthly: { cost: 600, selling: 900 }, deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp Business — Auto-reply & Booking', type: 'oneTime', oneTime: { cost: 300, selling: 500 }, monthly: { cost: 400, selling: 700 }, deliverDays: 0.5, stage: 'setup' },
        { id: 'reviews', label: 'Review Generation & Management', type: 'oneTime', oneTime: { cost: 200, selling: 300 }, monthly: { cost: 350, selling: 650 }, deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'social', label: 'Social Media — 8 Posts/month', type: 'oneTime', oneTime: { cost: 150, selling: 250 }, monthly: { cost: 300, selling: 500 }, deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'seo-report', label: 'Monthly SEO Health Report', type: 'oneTime', oneTime: { cost: 150, selling: 250 }, monthly: { cost: 200, selling: 400 }, deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'growth-ads', label: 'Google Ads setup', type: 'oneTime', oneTime: { cost: 0, selling: 999 }, deliverDays: 1, stage: 'build' },
        { id: 'growth-city', label: 'Cover another city', type: 'monthly', monthly: { cost: 0, selling: 999 }, deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Growth',
      minimumMonths: 3,
      annualMonthly: 4599,
    },
    {
      id: 'scale',
      name: 'Scale',
      oneTime: 11999,
      monthly: 7999,
      monthlyName: 'Business Partner',
      tagline: 'A dedicated team managing your online growth.',
      icon: 'Building2',
      timeline: 'Kick-off call within 3 days',
      timelineMode: 'phased',
      foundationDays: 30,
      inherited: { label: 'Everything in Growth', oneTime: 7999, monthly: 5499 },
      expectations: [
        { label: 'First 30 days', note: 'Audit, strategy, and your growth plan for the year.' },
        { label: 'Dedicated manager', note: 'One person who knows your business. Monthly strategy calls.' },
      ],
      services: [
        { id: 'account-manager', label: 'Dedicated Growth Manager', type: 'oneTime', oneTime: { cost: 400, selling: 1000 }, monthly: { cost: 500, selling: 700 } },
        { id: 'unlimited-updates', label: 'Content & Page Updates — Unlimited', type: 'oneTime', oneTime: { cost: 300, selling: 800 }, monthly: { cost: 350, selling: 500 } },
        { id: 'social-reels', label: 'Social Media — Reels & Stories', type: 'oneTime', oneTime: { cost: 300, selling: 800 }, monthly: { cost: 250, selling: 400 } },
        { id: 'google-ads', label: 'Google Ads — Campaign Setup & Run', type: 'oneTime', oneTime: { cost: 250, selling: 800 }, monthly: { cost: 300, selling: 550 }, deliverDays: 1, stage: 'build' },
        { id: 'competitor', label: 'Competitor & Market Analysis', type: 'oneTime', oneTime: { cost: 100, selling: 350 }, monthly: { cost: 100, selling: 150 } },
        { id: 'strategy', label: 'Monthly Strategy Call & Report', type: 'oneTime', oneTime: { cost: 50, selling: 250 }, monthly: { cost: 100, selling: 200 } },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', type: 'monthly', monthly: { cost: 0, selling: 999 } },
        { id: 'scale-multi', label: 'Multi-location', type: 'oneTime', oneTime: { cost: 0, selling: 1999 }, deliverDays: 1, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
      minimumMonths: 3,
      annualMonthly: 6699,
    },
    customPlan,
  ],
}
