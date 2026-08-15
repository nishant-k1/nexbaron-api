import type { Plan } from '../service-items-pricing-catalog'

export const customPlan: Plan = {
  id: 'custom',
  name: 'Custom',
  tagline: 'Not finding what you need? Let\'s build it together.',
  icon: 'MessageSquare',
  timeline: 'We\'ll scope and quote within 2 days',
  services: [
    { id: 'custom-mix', label: 'Pick services from any plan', items: [] },
    {
      id: 'custom-new',
      label:
        'Request services not listed above like Custom Software Development — Dashboards, CRMs, Internal Tools',
      items: [],
    },
    { id: 'custom-quote', label: 'Receive a custom quote within 48h', items: [] },
  ],
  addOns: [],
  ctaLabel: 'Contact Us',
}
