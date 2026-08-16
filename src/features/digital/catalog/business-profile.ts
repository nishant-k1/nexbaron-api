import type { BusinessProfile } from '../../../types/business-profile'

// Single source of truth for Nexbaron Digital's own business details (NAP,
// geo, hours, service area). Served at GET /digital/business and consumed by
// nexbaron-web for LocalBusiness schema, geo meta tags, footers, and contact.
export const DIGITAL_BUSINESS_PROFILE: BusinessProfile = {
  slug: 'digital',
  name: 'Nexbaron Digital',
  address: {
    street: '402, Vasavi Residency - 1, Green House Layout, Doddathoguru, Electronic City Phase - 1',
    locality: 'Bengaluru',
    region: 'Karnataka',
    postalCode: '560100',
    country: 'IN',
    display:
      '402, Vasavi Residency - 1, Green House Layout,\nDoddathoguru, Electronic City Phase - 1, Bengaluru - 560100',
  },
  geo: { lat: 12.850875, lng: 77.649625 },
  phone: '+919002785683',
  whatsappNumber: '919002785683',
  email: 'digital@nexbaron.com',
  gstin: '', // Set when the GST registration certificate is received.
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '10:00',
    closes: '19:00',
  },
  areaServed: ['Bengaluru'],
  priceRange: '₹₹',
  sameAs: [],
  logo: '/icon.svg',
  mapsQuery: '12.850875,77.649625',
}
