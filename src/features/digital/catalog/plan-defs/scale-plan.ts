import type { Plan } from '../service-items-pricing-catalog'
import { pickServices } from '../service-items-pricing-catalog'

export const scalePlan: Plan = {
  id: 'scale',
  name: 'Scale',
  tagline: 'A dedicated team managing your online growth.',
  icon: 'Building2',
  timeline: 'Kick-off call within 3 days',
  timelineMode: 'phased',
  foundationDays: 30,
  inherited: { label: 'Everything in Growth' },
  expectations: [
    { label: 'First 30 days', note: 'Audit, strategy, and your growth plan for the year.' },
    { label: 'Dedicated manager', note: 'One person who knows your business. Monthly strategy calls.' },
  ],
  services: pickServices([
    'account-manager', 'unlimited-updates', 'social-reels',
    'google-ads-management', 'meta-ads-management', 'email-marketing',
    'competitor',
  ]),
  addOns: pickServices(['scale-priority', 'scale-multi']),
  ctaLabel: 'Get Scale',
  minimumMonths: 3,
}
