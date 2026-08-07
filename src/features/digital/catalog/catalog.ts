export type BillingType = 'oneTime' | 'monthly'

export type ServiceStage = 'design' | 'build' | 'setup'

export interface CatalogService {
  id: string
  label: string
  price: number
  type: BillingType
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
}

export interface DigitalCatalog {
  version: string
  updatedAt: string
  currency: 'INR'
  plans: CatalogPlan[]
}

export const digitalCatalog: DigitalCatalog = {
  version: '2.0.0',
  updatedAt: '2026-08-07T00:00:00.000Z',
  currency: 'INR',
  plans: [
    {
      id: 'launch',
      name: 'Launch',
      oneTime: 34999,
      monthly: 2499,
      monthlyName: 'Care',
      tagline: 'A professional website for your business.',
      icon: 'Rocket',
      timeline: 'Live in 5–7 days',
      services: [
        { id: 'website', label: 'Website — up to 5 pages', price: 25000, type: 'oneTime', deliverDays: 3, stage: 'build' },
        { id: 'mobile', label: 'Works perfectly on phone', price: 4000, type: 'oneTime', deliverDays: 1, stage: 'design' },
        { id: 'branding', label: 'Logo, colours, and your photos', price: 2500, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'design' },
        { id: 'whatsapp', label: 'WhatsApp button on every page', price: 999, type: 'oneTime', deliverDays: 0, stage: 'build' },
        { id: 'gbp', label: 'Google Business Profile created', price: 1500, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'setup' },
        { id: 'email-leads', label: 'All enquiries sent to your phone', price: 2499, type: 'monthly', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'launch-pages', label: 'Extra pages', price: 1499, type: 'oneTime', unitLabel: 'per page', deliverDays: 0.5, stage: 'build' },
        { id: 'launch-photos', label: 'Additional photos', price: 699, type: 'oneTime', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-domain', label: 'Domain setup', price: 1499, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Launch',
    },
    {
      id: 'growth',
      name: 'Growth',
      oneTime: 64999,
      monthly: 4999,
      monthlyName: 'Growth Care',
      tagline: 'Get found on Google and booked on WhatsApp.',
      icon: 'TrendingUp',
      timeline: 'Live in 5–7 days · ranking builds over 4–8 weeks',
      featured: true,
      inherited: { label: 'Everything in Launch', oneTime: 34999, monthly: 2499 },
      services: [
        { id: 'gbp-optimise', label: 'Google profile optimised for your city', price: 20000, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'reviews', label: 'Review collection — we ask after every sale', price: 999, type: 'monthly', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'ranking', label: 'Rank for searches in your area', price: 1500, type: 'monthly', deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp booking and reminders', price: 999, type: 'monthly', deliverDays: 1, stage: 'setup' },
        { id: 'auto-reply', label: 'Auto-reply to common questions 24/7', price: 999, type: 'monthly', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'report', label: 'Monthly report in plain English', price: 499, type: 'monthly', deliverDays: 0, stage: 'setup' },
      ],
      addOns: [
        { id: 'growth-ads', label: 'Google Ads setup', price: 6999, type: 'oneTime', deliverDays: 1.5, stage: 'build' },
        { id: 'growth-city', label: 'Cover another city', price: 3999, type: 'monthly', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Growth',
    },
    {
      id: 'scale',
      name: 'Scale',
      oneTime: 109999,
      monthly: 9999,
      monthlyName: 'Business Partner',
      tagline: 'A dedicated team managing your online growth.',
      icon: 'Building2',
      timeline: 'Kick-off call within 3 days',
      timelineMode: 'phased',
      foundationDays: 30,
      inherited: { label: 'Everything in Growth', oneTime: 64999, monthly: 4999 },
      expectations: [
        { label: 'First 30 days', note: 'Audit, strategy, and your growth plan for the year.' },
        { label: 'Dedicated manager', note: 'One person who knows your business. Monthly strategy calls.' },
      ],
      services: [
        { id: 'manager', label: 'Dedicated growth manager', price: 2500, type: 'monthly' },
        { id: 'strategy', label: 'Monthly strategy call', price: 1500, type: 'monthly' },
        { id: 'unlimited-updates', label: 'Unlimited content and page updates', price: 2500, type: 'monthly' },
        { id: 'competitor', label: 'Competitor review every quarter', price: 1500, type: 'monthly' },
        { id: 'campaign-pages', label: 'Campaign and offer pages', price: 12000, type: 'oneTime', deliverDays: 3, stage: 'build' },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', price: 5000, type: 'monthly' },
        { id: 'scale-multi', label: 'Multi-location', price: 9999, type: 'oneTime', deliverDays: 2, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
    },
  ],
}
