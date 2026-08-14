import type { BusinessProfile } from '../shared/business-profile'

// Single source of truth for Nexbaron Print's own business details (NAP, geo,
// hours, service area). Served at GET /print/business and consumed by
// nexbaron-web for LocalBusiness schema, geo meta tags, footers, and contact.
export const PRINT_BUSINESS_PROFILE: BusinessProfile = {
  slug: 'print',
  name: 'Nexbaron Print',
  address: {
    street: '',
    locality: 'Begusarai',
    region: 'Bihar',
    postalCode: '851101',
    country: 'IN',
    display: 'Begusarai, Bihar - 851101',
  },
  geo: { lat: 25.555, lng: 86.16725 },
  phone: '+919899752254',
  whatsappNumber: '919899752254',
  email: 'print@nexbaron.com',
  gstin: '10AAKCN1234E1Z6',
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '10:00',
    closes: '19:00',
  },
  areaServed: [
    'Begusarai',
    'Patna',
    'Samastipur',
    'Khagaria',
    'Lakhisarai',
    'Munger',
    'Bhagalpur',
    'Hyderabad',
    'Chennai',
    'Mumbai',
    'Pune',
    'Delhi NCR',
  ],
  priceRange: '₹₹',
  sameAs: [],
  logo: '/icon.svg',
  mapsQuery: '25.555,86.16725',
}
