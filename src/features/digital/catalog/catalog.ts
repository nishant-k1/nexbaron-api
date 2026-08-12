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
  minimumMonths?: number
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
    { id: 'custom-mix', label: 'Pick services from any plan', price: 0, type: 'oneTime' },
    { id: 'custom-new', label: 'Request services not listed above', price: 0, type: 'oneTime' },
    { id: 'custom-quote', label: 'Receive a custom quote within 48h', price: 0, type: 'oneTime' },
  ],
  addOns: [],
  ctaLabel: 'Contact Us',
}

// ── v1 — Traditional agency pricing (higher setup, lower monthly) ──

export const digitalCatalogV1: DigitalCatalog = {
  version: '1.0.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
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
        { id: 'whatsapp', label: 'WhatsApp Chat Button', price: 499, carePrice: 50, type: 'oneTime', deliverDays: 0, stage: 'build' },
        { id: 'maps', label: 'Google Maps Business Listing', price: 1000, carePrice: 175, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'gbp', label: 'Google Business Profile — Setup & Verify', price: 500, carePrice: 50, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'setup' },
        { id: 'analytics', label: 'Visit Analytics', price: 500, carePrice: 150, type: 'oneTime', deliverDays: 1, parallel: true, stage: 'setup' },
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
        { id: 'gbp-optimise', label: 'Google Business Profile — Optimize & Rank', price: 3000, carePrice: 150, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'local-seo', label: 'Local SEO — Google Maps Ranking', price: 1500, carePrice: 150, type: 'oneTime', deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp Business — Auto-reply & Booking', price: 1000, carePrice: 100, type: 'oneTime', deliverDays: 1, stage: 'setup' },
        { id: 'reviews', label: 'Review Generation & Management', price: 1000, carePrice: 100, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'social', label: 'Social Media — 8 Posts/month', price: 500, carePrice: 75, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'seo-report', label: 'Monthly SEO Health Report', price: 500, carePrice: 50, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
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
        { id: 'account-manager', label: 'Dedicated Growth Manager', price: 3500, carePrice: 250, type: 'oneTime' },
        { id: 'unlimited-updates', label: 'Content & Page Updates — Unlimited', price: 2000, carePrice: 225, type: 'oneTime' },
        { id: 'social-reels', label: 'Social Media — Reels & Stories', price: 2000, carePrice: 200, type: 'oneTime' },
        { id: 'google-ads', label: 'Google Ads — Campaign Setup & Run', price: 3000, carePrice: 275, type: 'oneTime', deliverDays: 3, stage: 'build' },
        { id: 'competitor', label: 'Competitor & Market Analysis', price: 1000, carePrice: 150, type: 'oneTime' },
        { id: 'strategy', label: 'Monthly Strategy Call & Report', price: 1000, carePrice: 150, type: 'oneTime' },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', price: 1250, type: 'monthly' },
        { id: 'scale-multi', label: 'Multi-location', price: 4999, type: 'oneTime', deliverDays: 2, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
    },
    customPlan,
  ],
}

// ── v2 — AI-era pricing (low setup, realistic monthly for ongoing value) ──

export const digitalCatalogV2: DigitalCatalog = {
  version: '2.0.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  currency: 'INR',
  plans: [
    {
      id: 'launch',
      name: 'Launch',
      oneTime: 999,
      monthly: 499,
      monthlyName: 'Care',
      tagline: 'A professional website for your business.',
      icon: 'Rocket',
      timeline: 'Live in 2–3 days',
      services: [
        { id: 'website', label: 'Website — Up to 5 Pages', price: 400, carePrice: 150, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'whatsapp', label: 'WhatsApp Chat Button', price: 99, carePrice: 49, type: 'oneTime', deliverDays: 0, stage: 'build' },
        { id: 'maps', label: 'Google Maps Business Listing', price: 200, carePrice: 150, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'gbp', label: 'Google Business Profile — Setup & Verify', price: 100, carePrice: 50, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'analytics', label: 'Visit Analytics', price: 200, carePrice: 100, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'launch-pages', label: 'Extra pages', price: 199, type: 'oneTime', unitLabel: 'per page', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-photos', label: 'Additional photos', price: 99, type: 'oneTime', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-domain', label: 'Domain setup', price: 199, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Launch',
      minimumMonths: 3,
    },
    {
      id: 'growth',
      name: 'Growth',
      oneTime: 1999,
      monthly: 1499,
      monthlyName: 'Growth Care',
      tagline: 'Get found on Google and booked on WhatsApp.',
      icon: 'TrendingUp',
      timeline: 'Live in 2–3 days · ranking builds over 4–8 weeks',
      featured: true,
      inherited: { label: 'Everything in Launch', oneTime: 999, monthly: 499 },
      services: [
        { id: 'gbp-optimise', label: 'Google Business Profile — Optimize & Rank', price: 400, carePrice: 250, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'local-seo', label: 'Local SEO — Google Maps Ranking', price: 200, carePrice: 200, type: 'oneTime', deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp Business — Auto-reply & Booking', price: 200, carePrice: 150, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'reviews', label: 'Review Generation & Management', price: 100, carePrice: 150, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'social', label: 'Social Media — 8 Posts/month', price: 50, carePrice: 150, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'seo-report', label: 'Monthly SEO Health Report', price: 50, carePrice: 100, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'growth-ads', label: 'Google Ads setup', price: 999, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'growth-city', label: 'Cover another city', price: 500, type: 'monthly', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Growth',
      minimumMonths: 3,
    },
    {
      id: 'scale',
      name: 'Scale',
      oneTime: 2999,
      monthly: 3499,
      monthlyName: 'Business Partner',
      tagline: 'A dedicated team managing your online growth.',
      icon: 'Building2',
      timeline: 'Kick-off call within 3 days',
      timelineMode: 'phased',
      foundationDays: 30,
      inherited: { label: 'Everything in Growth', oneTime: 1999, monthly: 1499 },
      expectations: [
        { label: 'First 30 days', note: 'Audit, strategy, and your growth plan for the year.' },
        { label: 'Dedicated manager', note: 'One person who knows your business. Monthly strategy calls.' },
      ],
      services: [
        { id: 'account-manager', label: 'Dedicated Growth Manager', price: 250, carePrice: 500, type: 'oneTime' },
        { id: 'unlimited-updates', label: 'Content & Page Updates — Unlimited', price: 200, carePrice: 350, type: 'oneTime' },
        { id: 'social-reels', label: 'Social Media — Reels & Stories', price: 200, carePrice: 300, type: 'oneTime' },
        { id: 'google-ads', label: 'Google Ads — Campaign Setup & Run', price: 200, carePrice: 450, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'competitor', label: 'Competitor & Market Analysis', price: 100, carePrice: 200, type: 'oneTime' },
        { id: 'strategy', label: 'Monthly Strategy Call & Report', price: 50, carePrice: 200, type: 'oneTime' },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', price: 499, type: 'monthly' },
        { id: 'scale-multi', label: 'Multi-location', price: 1499, type: 'oneTime', deliverDays: 1, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
      minimumMonths: 3,
    },
    customPlan,
  ],
}

// ── v3 — AI-era pricing with token costs (recommended) ──

export const digitalCatalogV3: DigitalCatalog = {
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
        { id: 'website', label: 'Website — Up to 5 Pages', price: 2500, carePrice: 575, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'whatsapp', label: 'WhatsApp Chat Button', price: 499, carePrice: 115, type: 'oneTime', deliverDays: 0, stage: 'build' },
        { id: 'maps', label: 'Google Maps Business Listing', price: 1000, carePrice: 230, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'gbp', label: 'Google Business Profile — Setup & Verify', price: 500, carePrice: 115, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
        { id: 'analytics', label: 'Visit Analytics', price: 500, carePrice: 114, type: 'oneTime', deliverDays: 0.5, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'launch-pages', label: 'Extra pages', price: 299, type: 'oneTime', unitLabel: 'per page', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-photos', label: 'Additional photos', price: 199, type: 'oneTime', deliverDays: 0.25, stage: 'build' },
        { id: 'launch-domain', label: 'Domain setup', price: 499, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Launch',
      minimumMonths: 3,
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
        { id: 'gbp-optimise', label: 'Google Business Profile — Optimize & Rank', price: 1200, carePrice: 1200, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'local-seo', label: 'Local SEO — Google Maps Ranking', price: 500, carePrice: 900, type: 'oneTime', deliverDays: 0, stage: 'setup' },
        { id: 'whatsapp-book', label: 'WhatsApp Business — Auto-reply & Booking', price: 500, carePrice: 700, type: 'oneTime', deliverDays: 0.5, stage: 'setup' },
        { id: 'reviews', label: 'Review Generation & Management', price: 300, carePrice: 650, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'social', label: 'Social Media — 8 Posts/month', price: 250, carePrice: 500, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
        { id: 'seo-report', label: 'Monthly SEO Health Report', price: 250, carePrice: 400, type: 'oneTime', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      addOns: [
        { id: 'growth-ads', label: 'Google Ads setup', price: 999, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'growth-city', label: 'Cover another city', price: 999, type: 'monthly', deliverDays: 0.25, parallel: true, stage: 'setup' },
      ],
      ctaLabel: 'Get Growth',
      minimumMonths: 3,
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
        { id: 'account-manager', label: 'Dedicated Growth Manager', price: 1000, carePrice: 700, type: 'oneTime' },
        { id: 'unlimited-updates', label: 'Content & Page Updates — Unlimited', price: 800, carePrice: 500, type: 'oneTime' },
        { id: 'social-reels', label: 'Social Media — Reels & Stories', price: 800, carePrice: 400, type: 'oneTime' },
        { id: 'google-ads', label: 'Google Ads — Campaign Setup & Run', price: 800, carePrice: 550, type: 'oneTime', deliverDays: 1, stage: 'build' },
        { id: 'competitor', label: 'Competitor & Market Analysis', price: 350, carePrice: 150, type: 'oneTime' },
        { id: 'strategy', label: 'Monthly Strategy Call & Report', price: 250, carePrice: 200, type: 'oneTime' },
      ],
      addOns: [
        { id: 'scale-priority', label: 'Same-day priority support', price: 999, type: 'monthly' },
        { id: 'scale-multi', label: 'Multi-location', price: 1999, type: 'oneTime', deliverDays: 1, stage: 'build' },
      ],
      ctaLabel: 'Get Scale',
      minimumMonths: 3,
    },
    customPlan,
  ],
}

// Switch via CATALOG_VERSION env var: v3 = recommended (default), v2/v1 for rollback
export const digitalCatalog: DigitalCatalog =
  process.env.CATALOG_VERSION === 'v2' ? digitalCatalogV2 :
  process.env.CATALOG_VERSION === 'v1' ? digitalCatalogV1 :
  digitalCatalogV3
