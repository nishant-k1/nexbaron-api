import type { CatalogPlan } from '../catalog-master'
import { pickServices } from '../catalog-master'

export const launchPlan: CatalogPlan = {
  id: 'launch',
  name: 'Launch',
  tagline: 'A professional website for your business.',
  icon: 'Rocket',
  timeline: 'Live in 2–3 days',
  services: pickServices(['website', 'gbp', 'whatsapp', 'analytics']),
  addOns: pickServices(['launch-pages', 'launch-photos', 'launch-domain', 'branding-identity', 'business-email', 'brochure-pdf', 'ordering-page', 'ai-product-photos', 'staff-training']),
  ctaLabel: 'Get Launch',
  minimumMonths: 3,
}
