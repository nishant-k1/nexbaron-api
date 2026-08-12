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
  carePrice?: number
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
      oneTime: 4999,
      monthly: 624,
      monthlyName: 'Care',
      tagline: 'A professional website for your business.',
      icon: 'Rocket',
      timeline: 'Live in 5–7 days',
      services: [
        { id: 'website', label: 'Website — Up to 5 Pages', price: 2500, carePrice: 199, type: 'oneTime', deliverDays: 3, stage: 'build' },
        { id: 'whatsapp', label: 'WhatsApp Button on Every Page', price: 499, carePrice: 50, type: 'oneTime', deliverDays: 0, stage: 'build' },
        { id: 'gbp', label: 'Google Business Profile Setup', price: 500, carePrice: 50, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'setup' },
        { id: 'seo-basic', label: 'Basic SEO Setup', price: 1000, carePrice: 175, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'analytics', label: 'Basic Analytics', price: 500, carePrice: 150, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'launch-pages', label: 'Extra pages', price: 749, type: 'oneTime', unitLabel: 'per page', deliverDays: 0.5, stage: 'build' },
        { id: 'launch-photos', label: 'Additional photos', price: 350, type: 'oneTime', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-domain', label: 'Domain setup', price: 749, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Launch',
    },
    {
      id: 'growth',
      name: 'Growth',
      oneTime: 12499,
      monthly: 1249,
      monthlyName: 'Growth Care',
      tagline: 'Get found on Google and booked on WhatsApp.',
      icon: 'TrendingUp',
      timeline: 'Live in 5–7 days · ranking builds over 4–8 weeks',
      featured: true,
      inherited: { label: 'Everything in Launch', oneTime: 4999, monthly: 624 },
      services: [
        { id: 'gbp-optimise', label: 'Google Business Profile Optimized for Your City', price: 5000, carePrice: 125, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'local-seo', label: 'Local SEO to Improve Search Visibility', price: 500, carePrice: 125, type: 'oneTime', deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp Booking & Reminders', price: 500, carePrice: 100, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'seo-opt', label: 'SEO Optimization', price: 500, carePrice: 100, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'reviews', label: 'Review Management', price: 500, carePrice: 100, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'social', label: 'Social Media Posts', price: 500, carePrice: 75, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'growth-ads', label: 'Google Ads setup', price: 3499, type: 'oneTime', deliverDays: 1.5, stage: 'build' },
        { id: 'growth-city', label: 'Cover another city', price: 1000, type: 'monthly', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Growth',
    },
    {
      id: 'scale',
      name: 'Scale',
      oneTime: 24999,
      monthly: 2499,
      monthlyName: 'Business Partner',
      tagline: 'A dedicated team managing your online growth.',
      icon: 'Building2',
      timeline: 'Kick-off call within 3 days',
      timelineMode: 'phased',
      foundationDays: 30,
      inherited: { label: 'Everything in Growth', oneTime: 12499, monthly: 1249 },
      expectations: [
        { label: 'First 30 days', note: 'Audit, strategy, and your growth plan for the year.' },
        { label: 'Dedicated manager', note: 'One person who knows your business. Monthly strategy calls.' },
      ],
      services: [
        { id: 'unlimited-updates', label: 'Unlimited Content & Page Updates', price: 2000, carePrice: 200, type: 'oneTime' },
        { id: 'social-reels', label: 'Social Media Posts + Reels', price: 2000, carePrice: 200, type: 'oneTime' },
        { id: 'gbp-mgmt', label: 'Google Business Profile Management', price: 1500, carePrice: 150, type: 'oneTime' },
        { id: 'campaign-exec', label: 'Campaign Execution', price: 3000, carePrice: 200, type: 'oneTime', deliverDays: 3, stage: 'build' },
        { id: 'competitor', label: 'Competitor Analysis', price: 1500, carePrice: 150, type: 'oneTime' },
        { id: 'perf-report', label: 'Monthly Performance Report', price: 1500, carePrice: 200, type: 'oneTime' },
        { id: 'strategy', label: 'Monthly Strategy Call', price: 1000, carePrice: 150, type: 'oneTime' },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', price: 1250, type: 'monthly' },
        { id: 'scale-multi', label: 'Multi-location', price: 4999, type: 'oneTime', deliverDays: 2, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
    },
  ],
}
