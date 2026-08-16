// Canonical shape for our OWN business details (Nexbaron Digital / Nexbaron
// Print) — name, address, geo, hours, and service area. Distinct from the
// "service industries" (`digital/catalog/service-industries.ts`), which lists the
// *customer* businesses we serve.

export interface BusinessProfile {
  slug: 'digital' | 'print'
  name: string
  address: {
    street: string // may be empty for city-level addresses
    locality: string
    region: string
    postalCode: string
    country: string
    display: string // human-readable, "\n" for line breaks
  }
  geo: { lat: number; lng: number }
  phone: string // E.164, e.g. +919002785683
  whatsappNumber: string // digits only, including country code
  email: string
  gstin: string
  openingHours: { days: string[]; opens: string; closes: string }
  areaServed: string[]
  priceRange: string
  sameAs: string[] // Google Business Profile / social links (empty until created)
  logo: string // path served by the web client
  mapsQuery: string // "lat,lng" for map embeds
}
