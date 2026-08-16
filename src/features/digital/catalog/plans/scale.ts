import type { PlanFeature } from '../plans'

const features: PlanFeature[] = [
  {
    label: 'All Growth Features',
    description: 'Everything in Growth',
  },
  {
    label: 'Expanded Pages',
    description: 'Up to 15 standard pages + 5 Additional Location Pages for SEO',
    scope: '15 standard + 5 location pages',
  },
  {
    label: 'Advanced SEO',
    description: 'Advanced SEO setup',
  },
  {
    label: 'Custom Forms',
    description: 'Up to 2 Additional Custom forms',
    scope: '2 additional forms',
  },
  {
    label: 'Meta Tracking',
    description: 'Meta Conversion Tracking Setup',
  },
  {
    label: 'Lead Management',
    description: 'Lead Management System',
  },
  {
    label: 'Multi-channel Automation',
    description: 'Email and WhatsApp automation',
  },
  {
    label: 'Follow-up Automation',
    description: 'Lead follow-up automation',
  },
  {
    label: 'Blog Publishing',
    description:
      'Blog setup and publishing — 2 SEO blog articles/month, up to 1,000 words each',
    scope: '2 SEO articles/month, up to 1,000 words each',
  },
  {
    label: 'Local Citations',
    description:
      'Local Citation Setup — up to 5 relevant business directories',
    scope: 'up to 5 directories',
  },
  {
    label: 'Social Media Posts',
    description:
      'Social Media Post Creation & Publishing — 4 graphic posts and 2 shorts per month',
    scope: '4 graphic posts + 2 shorts/month',
  },
]

export default {
  name: 'Scale',
  tagline: 'Build systems that help you manage and automate growth.',
  timeline: 'Monthly scale plan',
  icon: 'Building2',
  ctaLabel: 'Discuss Scale',
  includes: ['growth'],
  timelineMode: 'phased' as const,
  foundationDays: 30,
  pricing: {
    setup: 99999,
    monthly: 9999,
    minimumMonths: 12,
  },
  features,
}
