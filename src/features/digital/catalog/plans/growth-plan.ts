import type { CatalogPlan } from '../catalog-master'
import { pickServices } from '../catalog-master'

export const growthPlan: CatalogPlan = {
  id: 'growth',
  name: 'Growth',
  tagline: 'Get found on Google and booked on WhatsApp.',
  icon: 'TrendingUp',
  timeline: 'Live in 2–3 days · ranking builds over 4–8 weeks',
  featured: true,
  inherited: { label: 'Everything in Launch' },
  services: pickServices(['gbp-optimise', 'local-seo', 'whatsapp-book', 'reviews', 'social', 'seo-report']),
  addOns: pickServices(['google-ads-setup', 'meta-ads-setup', 'email-marketing-setup', 'sms-marketing', 'growth-city']),
  ctaLabel: 'Get Growth',
  minimumMonths: 3,
}
