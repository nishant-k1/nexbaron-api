import type { PlanFeature } from '../plans'

const features: PlanFeature[] = [
  {
    label: 'Business Website',
    description: 'Business website — up to 5 standard pages',
    scope: 'up to 5 pages',
  },
  {
    label: 'Domain Setup',
    description: 'Domain setup',
  },
  {
    label: 'Business Email',
    description: 'Business email setup — 1 mailbox',
    scope: '1 mailbox',
  },
  {
    label: 'Contact Form',
    description: 'Contact/enquiry form',
  },
  {
    label: 'Email Notifications',
    description: 'Email notification for contact/enquiries',
  },
  {
    label: 'WhatsApp Chat',
    description: 'Floating WhatsApp Chat Button',
  },
  {
    label: 'Basic SEO',
    description: 'Basic SEO setup for 5 pages',
    scope:
      'Page titles, meta descriptions, heading structure, image alt text, URL structure, internal linking, sitemap/robots, Search Console submission',
  },
  {
    label: 'Google Maps',
    description: 'Google Maps Embed',
  },
  {
    label: 'Google Business Profile',
    description: 'Google Business Profile creation',
  },
  {
    label: 'Search Console',
    description: 'Google Search Console setup',
  },
  {
    label: 'Social Media Setup',
    description: 'Social Media Account Setup — up to 2 platforms',
    scope: 'up to 2 platforms',
  },
]

export default {
  name: 'Launch',
  tagline: 'Get your business online.',
  timeline: 'Scoped after consultation',
  icon: 'Rocket',
  ctaLabel: 'Discuss Launch',
  pricing: {
    setup: 24999,
    monthly: 1999,
    minimumMonths: 12,
  },
  features,
}
