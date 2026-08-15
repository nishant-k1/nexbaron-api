import type { Plan } from '../service-items-pricing-catalog'
import { pickServices } from '../service-items-pricing-catalog'

export const growthPlan: Plan = {
  id: 'growth',
  name: 'Growth',
  tagline: 'Get found on Google and booked on WhatsApp.',
  icon: 'TrendingUp',
  timeline: 'Live in 2–3 days · ranking builds over 4–8 weeks',
  featured: true,
  inherited: { label: 'Everything in Launch' },
  services: pickServices(['gbp-optimise', 'local-seo', 'whatsapp-book', 'reviews', 'social', 'seo-report']),
  addOns: pickServices(['google-ads-setup', 'meta-ads-setup', 'appointment-booking', 'qr-suite', 'email-marketing-setup', 'sms-marketing', 'blog-content', 'ai-chatbot', 'ai-content', 'ai-review-manager', 'ai-lead-qualifier', 'festive-campaign', 'growth-city']),
  ctaLabel: 'Get Growth',
  minimumMonths: 3,
  expectations: [
    { label: '1 website + WhatsApp business number', note: 'Excludes alphanumeric / API names (paid API pending)' },
    { label: 'Up to 25 Google Business Profile insights', note: 'See FAQ before booking' },
    { label: 'Up to 20 SMS + 10 WhatsApp campaigns/month', note: 'SMS credits billed pass-through at cost' },
    { label: '3 review requests/month', note: 'Extra requests billed at cost' },
    { label: 'Bi-weekly status updates', note: 'On scheduled calls' },
  ],
}
