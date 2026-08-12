import type { CatalogPlan } from '../catalog-master'
import { pickServices } from '../catalog-master'

export const customPlan: CatalogPlan = {
  id: 'custom',
  name: 'Custom',
  tagline: 'Not finding what you need? Let\'s build it together.',
  icon: 'MessageSquare',
  timeline: 'We\'ll scope and quote within 2 days',
  services: [
    ...pickServices(['custom-software']),
    { id: 'custom-mix', service: { label: 'Pick services from any plan', items: [] } },
    { id: 'custom-new', service: { label: 'Request services not listed above', items: [] } },
    { id: 'custom-quote', service: { label: 'Receive a custom quote within 48h', items: [] } },
  ],
  addOns: [],
  ctaLabel: 'Contact Us',
}
