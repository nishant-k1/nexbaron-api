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
  icon: string // Lucide icon name — mapped to component on the client
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
  version: '1.0.0',
  updatedAt: '2026-08-05T00:00:00.000Z',
  currency: 'INR',
  plans: [
    {
      id: 'launch',
      name: 'Launch',
      oneTime: 24999,
      monthly: 1499,
      monthlyName: 'Care',
      tagline: 'Get your business online, professionally.',
      icon: 'Rocket',
      timeline: 'Website live in ~7 days · visibility builds after',
      services: [
        {
          id: 'website',
          label: 'Professional business website (up to 4 pages)',
          price: 18000,
          type: 'oneTime',
          deliverDays: 3,
          stage: 'build',
        },
        {
          id: 'mobile-design',
          label: 'Mobile-perfect design',
          price: 3000,
          type: 'oneTime',
          deliverDays: 1,
          stage: 'design',
        },
        {
          id: 'logo',
          label: 'Your logo, colors & business photos',
          price: 2000,
          type: 'oneTime',
          deliverDays: 1,
          parallel: true,
          stage: 'design',
        },
        {
          id: 'whatsapp-btn',
          label: '\u201cWhatsApp us\u201d button on every page',
          price: 999,
          type: 'oneTime',
          deliverDays: 0,
          stage: 'build',
        },
        {
          id: 'gbp-setup',
          label: 'Google Business Profile created & submitted',
          price: 1000,
          type: 'oneTime',
          deliverDays: 1,
          parallel: true,
          stage: 'setup',
        },
        {
          id: 'enquiries',
          label: 'Every enquiry emailed straight to you',
          price: 1499,
          type: 'monthly',
          deliverDays: 0.5,
          parallel: true,
          stage: 'setup',
        },
      ],
      addOns: [
        {
          id: 'launch-extra-pages',
          label: 'Extra pages',
          price: 999,
          type: 'oneTime',
          unitLabel: 'per page',
          deliverDays: 0.5,
          stage: 'build',
        },
        {
          id: 'launch-photos',
          label: 'Additional photos',
          price: 499,
          type: 'oneTime',
          deliverDays: 0.25,
          stage: 'build',
        },
        {
          id: 'launch-domain',
          label: 'Domain setup',
          price: 999,
          type: 'oneTime',
          deliverDays: 0.5,
          parallel: true,
          stage: 'setup',
        },
      ],
      ctaLabel: 'Start With Launch',
    },
    {
      id: 'growth',
      name: 'Growth',
      oneTime: 39999,
      monthly: 3999,
      monthlyName: 'Growth Care',
      tagline: 'Generate more calls, WhatsApp enquiries, and Google leads every month.',
      icon: 'TrendingUp',
      timeline: 'Website live in ~9 days · rankings over 4\u20138 weeks',
      featured: true,
      inherited: { label: 'Everything in Launch', oneTime: 24999, monthly: 1499 },
      services: [
        {
          id: 'gbp-opt',
          label: 'Google Business Profile optimization',
          price: 15000,
          type: 'oneTime',
          deliverDays: 1,
          stage: 'setup',
        },
        {
          id: 'reviews',
          label: 'Review system — we ask after every sale',
          price: 800,
          type: 'monthly',
          deliverDays: 0.5,
          parallel: true,
          stage: 'setup',
        },
        {
          id: 'rank',
          label: 'Rank for \u201cnear me\u201d searches in your city',
          price: 1000,
          type: 'monthly',
          deliverDays: 0,
          stage: 'setup',
        },
        {
          id: 'whatsapp-booking',
          label: 'WhatsApp booking & no-show reminders',
          price: 800,
          type: 'monthly',
          deliverDays: 1,
          stage: 'setup',
        },
        {
          id: 'auto-answers',
          label: '24/7 automatic answers (hours, address, prices)',
          price: 900,
          type: 'monthly',
          deliverDays: 0.5,
          parallel: true,
          stage: 'setup',
        },
        {
          id: 'report',
          label: 'Plain-English monthly ranking report',
          price: 499,
          type: 'monthly',
          deliverDays: 0,
          stage: 'setup',
        },
      ],
      addOns: [
        {
          id: 'growth-ads',
          label: 'Google Ads setup',
          price: 4999,
          type: 'oneTime',
          deliverDays: 1.5,
          stage: 'build',
        },
        {
          id: 'growth-city',
          label: 'Extra city coverage',
          price: 3000,
          type: 'monthly',
          deliverDays: 0.5,
          parallel: true,
          stage: 'setup',
        },
      ],
      ctaLabel: 'Start With Growth',
    },
    {
      id: 'scale',
      name: 'Scale',
      oneTime: 59999,
      monthly: 7999,
      monthlyName: 'Business Partner',
      tagline: 'Your outsourced digital growth team.',
      icon: 'MapPin',
      timeline: '30-day foundation: audit \u2192 strategy \u2192 growth plan',
      timelineMode: 'phased',
      foundationDays: 30,
      inherited: { label: 'Everything in Growth', oneTime: 39999, monthly: 3999 },
      expectations: [
        {
          label: 'Foundation & audit',
          note: 'First 30 days: foundation, audit, and your growth plan for the year.',
        },
        {
          label: 'Growth manager',
          note: 'A dedicated contact plus monthly strategy sessions from month one.',
        },
      ],
      services: [
        { id: 'manager', label: 'Dedicated growth manager', price: 1500, type: 'monthly' },
        {
          id: 'strategy',
          label: 'Monthly strategy session & growth plan',
          price: 1000,
          type: 'monthly',
        },
        {
          id: 'unlimited-content',
          label: 'Unlimited content & page updates',
          price: 1500,
          type: 'monthly',
        },
        {
          id: 'competitor-review',
          label: 'Quarterly competitor review',
          price: 1000,
          type: 'monthly',
        },
        {
          id: 'campaign-pages',
          label: 'Campaign & offer pages (seasonal, launches)',
          price: 9000,
          type: 'oneTime',
          deliverDays: 3,
          stage: 'build',
        },
      ],
      addOns: [
        {
          id: 'scale-support',
          label: 'Same-day priority support',
          price: 5000,
          type: 'monthly',
        },
        {
          id: 'scale-multi',
          label: 'Multi-location campaigns',
          price: 8000,
          type: 'oneTime',
          deliverDays: 2,
          stage: 'build',
        },
        {
          id: 'scale-reporting',
          label: 'Advanced reporting',
          price: 4000,
          type: 'monthly',
        },
      ],
      ctaLabel: 'Start With Scale',
    },
  ],
}