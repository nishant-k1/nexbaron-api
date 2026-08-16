import type { PlanFeature } from '../plans'

const features: PlanFeature[] = [
  {
    label: 'All Launch Features',
    description: 'Everything included in Launch',
  },
  {
    label: 'Expanded Pages',
    description: 'Up to 10 standard pages + 2 Additional Location Pages for SEO',
    scope: '10 standard + 2 location pages',
  },
  {
    label: 'On-Page SEO',
    description: 'On-Page SEO Optimization for up to 10 pages',
    scope: 'up to 10 pages',
  },
  {
    label: 'Custom Forms',
    description: 'Up to 1 Additional Custom form',
    scope: '1 additional form',
  },
  {
    label: 'Blog Publishing',
    description:
      'Blog setup and publishing — 1 SEO blog article/month, up to 1,000 words',
    scope: '1 SEO article/month, up to 1,000 words',
  },
  {
    label: 'Lead Capture',
    description: 'WhatsApp and Email lead capture',
  },
  {
    label: 'Live Chat',
    description: 'Floating Live Chat button',
  },
  {
    label: 'Social Media Posts',
    description:
      'Social Media Post Creation & Publishing — 2 graphic posts and 1 short per month',
    scope: '2 graphic posts + 1 short/month',
  },
  {
    label: 'Conversion Tracking',
    description: 'Google Conversion Tracking Setup',
  },
  {
    label: 'Local Citations',
    description:
      'Local Citation Setup — up to 2 relevant business directories',
    scope: 'up to 2 directories',
  },
  {
    label: 'Schema Markup',
    description: 'Schema Markup & Structured Data',
  },
]

export default {
  name: 'Growth',
  tagline: 'Turn your website into a lead-generation channel.',
  timeline: 'Monthly growth plan',
  icon: 'TrendingUp',
  ctaLabel: 'Discuss Growth',
  featured: true,
  includes: ['launch'],
  pricing: {
    setup: 49999,
    monthly: 4999,
    minimumMonths: 12,
  },
  features,
}
