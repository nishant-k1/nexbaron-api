import type { Plan } from '../service-items-pricing-catalog'
import { pickServices } from '../service-items-pricing-catalog'

export const launchPlan: Plan = {
  id: 'launch',
  name: 'Launch',
  tagline: 'A professional website for your business.',
  icon: 'Rocket',
  timeline: 'Live in 2–3 days',
  services: pickServices(['website', 'gbp', 'whatsapp', 'analytics']),
  addOns: pickServices(['launch-pages', 'launch-photos', 'launch-domain', 'branding-identity', 'business-email', 'brochure-pdf', 'ordering-page', 'ai-product-photos', 'staff-training']),
  ctaLabel: 'Get Launch',
  minimumMonths: 3,
  expectations: [
    { label: 'Up to 8 pages', note: 'Extra pages project-quoted' },
    { label: '1 round of content revisions', note: '2 rounds for photos' },
    { label: 'Month 1 launch support', note: 'Then self-serve dashboard' },
  ],
}
