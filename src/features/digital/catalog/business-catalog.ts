import { resolveServiceBundle, type Service } from './service-catalog'

export type BusinessTier = 'tier1' | 'tier2'

export interface BusinessType {
  id: string
  slug: string
  label: string
  category: string
  tier: BusinessTier
  icon: string
  tagline: string
  problems: string[]
  recommendedPlan: string
  serviceIds: string[]
  addOnIds: string[]
}

export interface ResolvedBusiness extends BusinessType {
  services: Service[]
  addOns: Service[]
  pricing: { setup: number; monthly: number; annual: number }
}

export const BUSINESS_CATEGORIES = [
  'Food & Hospitality',
  'Beauty & Wellness',
  'Healthcare',
  'Education',
  'Retail',
  'Home Services',
  'Professional Services',
  'Creative & Events',
  'Pets & Veterinary',
  'Automotive Sales',
  'Home & Construction',
  'Travel & Transport',
  'Repairs & Maintenance',
] as const

// Single source of truth for the businesses we serve. Each type references
// master catalog service IDs (resolved at read time), so "what does a
// restaurant need" is derived from the same catalog that prices every plan.
export const BUSINESS_TYPES: BusinessType[] = [
  // --- Food & Hospitality ---
  {
    id: 'restaurants', slug: 'restaurants', label: 'Restaurants',
    category: 'Food & Hospitality', tier: 'tier2', icon: 'Utensils',
    tagline: 'Get found by hungry locals and take orders on WhatsApp.',
    problems: [
      'Customers searching "near me" pick your competitor?',
      'Your menu and offers invisible on phones?',
      'Good reviews going unwritten?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'qr-suite'],
    addOnIds: ['ordering-page', 'appointment-booking', 'meta-ads-setup'],
  },
  {
    id: 'cafes', slug: 'cafes', label: 'Cafes & Tea Stalls',
    category: 'Food & Hospitality', tier: 'tier1', icon: 'Coffee',
    tagline: 'A QR menu and a Google presence that fills seats.',
    problems: [
      'Passers-by can\'t find you on Maps?',
      'Your menu isn\'t scannable on the table?',
      'No way for customers to order ahead?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'qr-suite'],
    addOnIds: ['launch-pages'],
  },
  {
    id: 'bakeries', slug: 'bakeries', label: 'Bakeries & Sweet Shops',
    category: 'Food & Hospitality', tier: 'tier1', icon: 'Cake',
    tagline: 'Show off your bakes and take festive orders online.',
    problems: [
      'Customers asking for your menu on WhatsApp?',
      'Festive orders getting missed?',
      'Your best cakes hidden from new buyers?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['festive-campaign'],
  },
  {
    id: 'hotels', slug: 'hotels', label: 'Boutique Hotels & Homestays',
    category: 'Food & Hospitality', tier: 'tier2', icon: 'Hotel',
    tagline: 'A presence that books rooms while you sleep.',
    problems: [
      'Travellers booking the hotel that shows up first?',
      'No easy way for guests to check availability?',
      'Reviews and photos not selling the experience?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'social'],
    addOnIds: ['appointment-booking', 'meta-ads-management', 'sms-marketing'],
  },
  {
    id: 'cloud-kitchens', slug: 'cloud-kitchens', label: 'Cloud Kitchens & Tiffin Services',
    category: 'Food & Hospitality', tier: 'tier1', icon: 'CookingPot',
    tagline: 'Daily orders and meal plans booked on WhatsApp.',
    problems: [
      'Regulars calling to place repeat orders?',
      'Weekly meal plans hard to manage over calls?',
      'Your kitchen invisible to hungry locals?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['sms-marketing'],
  },
  {
    id: 'caterers', slug: 'caterers', label: 'Caterers',
    category: 'Food & Hospitality', tier: 'tier2', icon: 'ChefHat',
    tagline: 'Menus, reviews and proposals that win every event.',
    problems: [
      'Event enquiries scattered across calls and DMs?',
      'Your menus and past events not visible?',
      'Proposals taking too long to send?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'social', 'brochure-pdf'],
    addOnIds: ['festive-campaign'],
  },

  // --- Beauty & Wellness ---
  {
    id: 'salons', slug: 'salons', label: 'Salons & Beauty Parlours',
    category: 'Beauty & Wellness', tier: 'tier1', icon: 'Scissors',
    tagline: 'Fill your chairs with online booking and reminders.',
    problems: [
      'Chairs sitting empty on your busy days?',
      'Clients forgetting to rebook?',
      'No-shows costing you revenue?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'appointment-booking'],
    addOnIds: ['social', 'sms-marketing'],
  },
  {
    id: 'spas', slug: 'spas', label: 'Spas & Wellness Centres',
    category: 'Beauty & Wellness', tier: 'tier2', icon: 'Flower2',
    tagline: 'Package bookings and a calm, premium online presence.',
    problems: [
      'Clients comparing you against bigger spas?',
      'Package bookings hard to manage over calls?',
      'Your atmosphere not coming through online?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'social', 'appointment-booking'],
    addOnIds: ['sms-marketing', 'festive-campaign'],
  },
  {
    id: 'gyms', slug: 'gyms', label: 'Gyms & Fitness Studios',
    category: 'Beauty & Wellness', tier: 'tier2', icon: 'Dumbbell',
    tagline: 'Fill memberships and classes with reminders and reviews.',
    problems: [
      'Memberships not renewing?',
      'Prospects picking the gym that answers first?',
      'Classes under-booked and hard to fill?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'social'],
    addOnIds: ['appointment-booking', 'sms-marketing', 'membership'],
  },

  // --- Healthcare ---
  {
    id: 'clinics', slug: 'clinics', label: 'Doctor Clinics',
    category: 'Healthcare', tier: 'tier1', icon: 'Stethoscope',
    tagline: 'Patients book themselves and never miss an appointment.',
    problems: [
      'Too many calls just to check timings?',
      'Patients asking for directions?',
      'Appointments getting missed?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'appointment-booking'],
    addOnIds: ['whatsapp-book', 'sms-marketing'],
  },
  {
    id: 'multi-speciality', slug: 'multi-speciality', label: 'Multi-Speciality Clinics',
    category: 'Healthcare', tier: 'tier2', icon: 'HeartPulse',
    tagline: 'One front desk for every department, online and always on.',
    problems: [
      'Patients routed through a confusing front desk?',
      'Departments and doctors hard to find online?',
      'Follow-ups slipping through the cracks?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'appointment-booking'],
    addOnIds: ['ai-chatbot', 'email-marketing-setup', 'sms-marketing'],
  },
  {
    id: 'dentists', slug: 'dentists', label: 'Dentists & Dental Clinics',
    category: 'Healthcare', tier: 'tier1', icon: 'SmilePlus',
    tagline: 'Bookings, reminders and reviews that keep chairs full.',
    problems: [
      'Patients forgetting check-ups and follow-ups?',
      'Too many calls just to book a slot?',
      'Your clinic not showing for "dentist near me"?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'appointment-booking'],
    addOnIds: ['whatsapp-book', 'sms-marketing'],
  },
  {
    id: 'diagnostic-labs', slug: 'diagnostic-labs', label: 'Diagnostic Labs & Pathology',
    category: 'Healthcare', tier: 'tier2', icon: 'Microscope',
    tagline: 'Reports delivered on WhatsApp and bookings made in seconds.',
    problems: [
      'Patients calling to check timings and report status?',
      'Home collection requests scattered across calls?',
      'Your lab invisible to local searches?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'appointment-booking'],
    addOnIds: ['sms-marketing', 'ai-chatbot'],
  },
  {
    id: 'opticians', slug: 'opticians', label: 'Opticians & Eye Care',
    category: 'Healthcare', tier: 'tier1', icon: 'Glasses',
    tagline: 'A storefront that turns walk-ins into repeat buyers.',
    problems: [
      'Customers asking for frames on WhatsApp?',
      'Eye-test appointments hard to manage?',
      'New collections not reaching regulars?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['reviews'],
  },
  {
    id: 'physiotherapy', slug: 'physiotherapy', label: 'Physiotherapy Centres',
    category: 'Healthcare', tier: 'tier1', icon: 'Activity',
    tagline: 'Sessions booked and rehab plans shared without phone tag.',
    problems: [
      'Patients missing recovery sessions?',
      'Booking slots over back-and-forth calls?',
      'Your expertise not visible to new patients?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'appointment-booking'],
    addOnIds: ['sms-marketing'],
  },

  // --- Education ---
  {
    id: 'tutors', slug: 'tutors', label: 'Private Tutors',
    category: 'Education', tier: 'tier1', icon: 'GraduationCap',
    tagline: 'Get found by parents and book demo classes online.',
    problems: [
      'Parents finding the tutor with better reviews?',
      'Demo classes hard to schedule over the phone?',
      'Your results and credentials not visible?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'reviews'],
    addOnIds: ['appointment-booking'],
  },
  {
    id: 'coaching', slug: 'coaching', label: 'Coaching Institutes',
    category: 'Education', tier: 'tier2', icon: 'BookOpen',
    tagline: 'Admissions enquiries captured and followed up automatically.',
    problems: [
      'Enquiries going cold after hours?',
      'Results and faculty not showcased?',
      'Follow-ups slipping through the cracks?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'social'],
    addOnIds: ['appointment-booking', 'sms-marketing', 'email-marketing-setup'],
  },
  {
    id: 'schools', slug: 'schools', label: 'Schools & Pre-Schools',
    category: 'Education', tier: 'tier2', icon: 'School',
    tagline: 'Admissions season without the enquiry chaos.',
    problems: [
      'Parents comparing schools online before calling?',
      'Admission enquiries scattered across calls and WhatsApp?',
      'Events and achievements not visible?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'social'],
    addOnIds: ['ai-lead-qualifier', 'email-marketing-setup'],
  },
  {
    id: 'dance-music', slug: 'dance-music', label: 'Dance & Music Academies',
    category: 'Education', tier: 'tier1', icon: 'Music',
    tagline: 'Demo videos and trial bookings that fill every batch.',
    problems: [
      'Parents judging your academy by a few clips?',
      'Trial classes hard to schedule over the phone?',
      'Your best performances hidden across apps?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'social-reels'],
    addOnIds: ['appointment-booking'],
  },
  {
    id: 'daycares', slug: 'daycares', label: 'Daycares & Play Schools',
    category: 'Education', tier: 'tier1', icon: 'Baby',
    tagline: 'Trust built online before parents ever visit.',
    problems: [
      'Parents comparing daycares online first?',
      'Enquiries lost after hours?',
      'Your safety and activities not visible?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'appointment-booking'],
    addOnIds: ['reviews'],
  },
  {
    id: 'skill-centres', slug: 'skill-centres', label: 'Skill & Certification Centres',
    category: 'Education', tier: 'tier2', icon: 'Award',
    tagline: 'Course enquiries captured and nurtured into enrolments.',
    problems: [
      'Enquiries going cold between calls and DMs?',
      'Courses and fees hard to find online?',
      'Placements and results not showcased?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'social'],
    addOnIds: ['email-marketing-setup', 'ai-lead-qualifier'],
  },

  // --- Retail ---
  {
    id: 'kirana', slug: 'kirana', label: 'Kirana & Grocery Stores',
    category: 'Retail', tier: 'tier1', icon: 'ShoppingCart',
    tagline: 'Take orders on WhatsApp and accept UPI with a QR.',
    problems: [
      'Customers calling to ask what\'s in stock?',
      'No easy way to take phone orders?',
      'Nearby shoppers can\'t find you online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['qr-suite'],
  },
  {
    id: 'boutiques', slug: 'boutiques', label: 'Boutiques & Tailoring',
    category: 'Retail', tier: 'tier1', icon: 'Shirt',
    tagline: 'A catalogue that sells your designs on WhatsApp.',
    problems: [
      'Customers asking to see your latest designs?',
      'New arrivals not reaching your regulars?',
      'Your craftsmanship invisible online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'social'],
    addOnIds: ['ai-product-photos'],
  },
  {
    id: 'supermarkets', slug: 'supermarkets', label: 'Supermarkets',
    category: 'Retail', tier: 'tier2', icon: 'Store',
    tagline: 'Offers, delivery, and a store locator that brings footfall.',
    problems: [
      'Shoppers picking the store that shows up first?',
      'Offers and new stock not reaching customers?',
      'Delivery enquiries hard to manage?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'social'],
    addOnIds: ['sms-marketing', 'delivery-tracking'],
  },
  {
    id: 'pharmacies', slug: 'pharmacies', label: 'Pharmacies & Medical Stores',
    category: 'Retail', tier: 'tier2', icon: 'Pill',
    tagline: 'Order-ahead refills and reminders for regular customers.',
    problems: [
      'Patients calling to check medicine availability?',
      'Refills and reminders hard to track?',
      'Your store not showing for "pharmacy near me"?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'ordering-page'],
    addOnIds: ['sms-marketing'],
  },
  {
    id: 'jewellers', slug: 'jewellers', label: 'Jewellers & Gold Retailers',
    category: 'Retail', tier: 'tier2', icon: 'Gem',
    tagline: 'Collections that shine online and bring festive footfall.',
    problems: [
      'Customers asking to see new designs on WhatsApp?',
      'Festive buyers picking the store that shows up first?',
      'Your craftsmanship invisible to new buyers?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'social-reels'],
    addOnIds: ['ai-product-photos', 'festive-campaign'],
  },
  {
    id: 'electronics-mobile', slug: 'electronics-mobile', label: 'Electronics & Mobile Stores',
    category: 'Retail', tier: 'tier1', icon: 'Tablet',
    tagline: 'Stock, offers and UPI orders on one WhatsApp link.',
    problems: [
      'Customers calling to check models and prices?',
      'New arrivals not reaching your regulars?',
      'Nearby shoppers can\'t find you online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['ai-product-photos'],
  },
  {
    id: 'hardware-paint', slug: 'hardware-paint', label: 'Hardware & Paint Shops',
    category: 'Retail', tier: 'tier1', icon: 'Paintbrush',
    tagline: 'Contractors and DIYers find you for every "near me" search.',
    problems: [
      'Contractors asking for quotes on WhatsApp?',
      'Stock and shades hard to share online?',
      'Your store not ranking for local searches?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['reviews'],
  },

  // --- Home Services ---
  {
    id: 'plumbers-electricians', slug: 'plumbers-electricians', label: 'Plumbers & Electricians',
    category: 'Home Services', tier: 'tier1', icon: 'Wrench',
    tagline: 'Get found for "near me" emergencies and book instantly.',
    problems: [
      'Emergency calls going to the competitor who ranks first?',
      'No easy way to get a quote or book a visit?',
      'Your work and reviews not visible?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'reviews'],
    addOnIds: ['launch-pages'],
  },
  {
    id: 'laundry', slug: 'laundry', label: 'Laundry & Dry Cleaners',
    category: 'Home Services', tier: 'tier1', icon: 'Shirt',
    tagline: 'Pickup requests and status updates on WhatsApp.',
    problems: [
      'Customers calling to schedule pickups?',
      'Order status hard to communicate?',
      'Nearby customers can\'t find you online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['delivery-tracking'],
  },
  {
    id: 'car-service', slug: 'car-service', label: 'Car Service Centres',
    category: 'Home Services', tier: 'tier2', icon: 'Car',
    tagline: 'Service bookings and reminders that keep bays full.',
    problems: [
      'Customers forgetting service due dates?',
      'Bookings scattered across calls?',
      'Your centre not ranking for local searches?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'appointment-booking'],
    addOnIds: ['sms-marketing'],
  },
  {
    id: 'cleaning-services', slug: 'cleaning-services', label: 'Cleaning Services',
    category: 'Home Services', tier: 'tier1', icon: 'Sparkles',
    tagline: 'Bookings and reminders that keep your calendar full.',
    problems: [
      'Customers calling to schedule and reschedule?',
      'Repeat bookings hard to track?',
      'Nearby customers can\'t find you online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['reviews'],
  },

  // --- Professional Services ---
  {
    id: 'law-ca', slug: 'law-ca', label: 'Law & CA Firms',
    category: 'Professional Services', tier: 'tier2', icon: 'Scale',
    tagline: 'A credible presence that wins trust before the first call.',
    problems: [
      'Clients Googling your practice area first?',
      'Your firm not looking established online?',
      'Consultations going to the firm that does?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'business-email'],
    addOnIds: ['appointment-booking', 'blog-content'],
  },
  {
    id: 'real-estate', slug: 'real-estate', label: 'Real Estate & Builders',
    category: 'Professional Services', tier: 'tier2', icon: 'Building',
    tagline: 'Project pages and instant enquiries that never slip.',
    problems: [
      'Serious buyers going cold after they enquire?',
      'Follow-ups slipping through the cracks?',
      'Projects invisible to local buyers?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'social', 'brochure-pdf'],
    addOnIds: ['ai-lead-qualifier', 'meta-ads-setup'],
  },
  {
    id: 'astrologers', slug: 'astrologers', label: 'Astrologers & Vastu Consultants',
    category: 'Professional Services', tier: 'tier1', icon: 'Moon',
    tagline: 'Consultations booked and trust built before the first call.',
    problems: [
      'Clients hesitant to book without seeing credentials?',
      'Consultations hard to schedule over the phone?',
      'Your expertise invisible online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'appointment-booking'],
    addOnIds: ['reviews'],
  },
  {
    id: 'consultants-freelancers', slug: 'consultants-freelancers', label: 'Consultants & Freelancers',
    category: 'Professional Services', tier: 'tier1', icon: 'Briefcase',
    tagline: 'A credible footprint that wins clients while you work.',
    problems: [
      'Looking unestablished to new clients?',
      'Enquiries lost after you close for the day?',
      'No time to maintain an online presence?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'business-email'],
    addOnIds: ['blog-content'],
  },
  {
    id: 'insurance-agents', slug: 'insurance-agents', label: 'Insurance Agents & Advisors',
    category: 'Professional Services', tier: 'tier1', icon: 'ShieldCheck',
    tagline: 'Leads qualified and policies explained before the call.',
    problems: [
      'Prospects comparing agents online first?',
      'Follow-ups slipping through the cracks?',
      'Your products and track record not visible?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'business-email'],
    addOnIds: ['ai-lead-qualifier'],
  },

  // --- Creative & Events ---
  {
    id: 'photographers', slug: 'photographers', label: 'Photographers',
    category: 'Creative & Events', tier: 'tier1', icon: 'Camera',
    tagline: 'A portfolio that books shoots while you\'re shooting.',
    problems: [
      'Clients asking to see your portfolio on WhatsApp?',
      'Your best work hidden across apps?',
      'Bookings coming in while you\'re busy?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'social-reels'],
    addOnIds: ['branding-identity'],
  },
  {
    id: 'event-planners', slug: 'event-planners', label: 'Event Planners',
    category: 'Creative & Events', tier: 'tier2', icon: 'CalendarDays',
    tagline: 'Enquiries captured and packaged into winning proposals.',
    problems: [
      'Enquiries scattered across calls and DMs?',
      'Your past events not showcasing your range?',
      'Proposals taking too long to send?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'social', 'brochure-pdf'],
    addOnIds: ['ai-lead-qualifier', 'festive-campaign'],
  },
  {
    id: 'startups', slug: 'startups', label: 'Startups & SMEs',
    category: 'Creative & Events', tier: 'tier1', icon: 'Rocket',
    tagline: 'A credible footprint live on a confirmed date.',
    problems: [
      'Looking unprofessional to new customers?',
      'No time to figure out a website?',
      'Lost enquiries after you close for the day?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'analytics', 'branding-identity'],
    addOnIds: ['business-email'],
  },

  // --- Pets & Veterinary ---
  {
    id: 'vets', slug: 'vets', label: 'Veterinary Clinics',
    category: 'Pets & Veterinary', tier: 'tier2', icon: 'PawPrint',
    tagline: 'Appointments, reminders and records that care for every pet.',
    problems: [
      'Pet parents forgetting vaccinations and follow-ups?',
      'Booking slots over back-and-forth calls?',
      'Your clinic not ranking for local searches?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'appointment-booking'],
    addOnIds: ['sms-marketing', 'ai-chatbot'],
  },
  {
    id: 'pet-shops', slug: 'pet-shops', label: 'Pet Shops & Grooming',
    category: 'Pets & Veterinary', tier: 'tier1', icon: 'Dog',
    tagline: 'Products, grooming and bookings on one WhatsApp link.',
    problems: [
      'Customers asking what\'s in stock on WhatsApp?',
      'Grooming appointments hard to schedule?',
      'New arrivals not reaching pet parents?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['ai-product-photos'],
  },

  // --- Automotive Sales ---
  {
    id: 'car-bike-dealers', slug: 'car-bike-dealers', label: 'Car & Bike Dealerships',
    category: 'Automotive Sales', tier: 'tier2', icon: 'CarFront',
    tagline: 'Showroom enquiries captured and followed up automatically.',
    problems: [
      'Serious buyers going cold after they enquire?',
      'Stock and offers invisible to local buyers?',
      'Test drives scattered across calls?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'local-seo', 'reviews', 'social'],
    addOnIds: ['ai-lead-qualifier', 'meta-ads-setup'],
  },
  {
    id: 'used-car-dealers', slug: 'used-car-dealers', label: 'Used Car Dealers',
    category: 'Automotive Sales', tier: 'tier1', icon: 'CarTaxiFront',
    tagline: 'Inventory that sells itself on WhatsApp and Instagram.',
    problems: [
      'Buyers asking for photos and history on WhatsApp?',
      'New stock not reaching serious buyers?',
      'Your trustworthiness not visible online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'social-reels'],
    addOnIds: ['ai-product-photos'],
  },

  // --- Home & Construction ---
  {
    id: 'interior-designers', slug: 'interior-designers', label: 'Interior Designers',
    category: 'Home & Construction', tier: 'tier2', icon: 'Sofa',
    tagline: 'Portfolios and project pages that win premium clients.',
    problems: [
      'Clients judging you by a few photos?',
      'Enquiries scattered across calls and DMs?',
      'Your portfolio not showcasing your range?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'social-reels', 'brochure-pdf'],
    addOnIds: ['ai-lead-qualifier', 'meta-ads-setup'],
  },
  {
    id: 'contractors-builders', slug: 'contractors-builders', label: 'Contractors & Builders',
    category: 'Home & Construction', tier: 'tier2', icon: 'HardHat',
    tagline: 'Project pages and instant enquiries that never slip.',
    problems: [
      'Serious clients going cold after they enquire?',
      'Past projects not showcasing your capability?',
      'Your firm invisible to local searches?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'reviews', 'brochure-pdf'],
    addOnIds: ['ai-lead-qualifier'],
  },
  {
    id: 'furniture-showrooms', slug: 'furniture-showrooms', label: 'Furniture Showrooms',
    category: 'Home & Construction', tier: 'tier1', icon: 'Armchair',
    tagline: 'A catalogue that brings buyers to your showroom.',
    problems: [
      'Customers asking to see collections on WhatsApp?',
      'New arrivals not reaching your regulars?',
      'Your designs invisible to new buyers?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'ordering-page'],
    addOnIds: ['ai-product-photos'],
  },

  // --- Travel & Transport ---
  {
    id: 'travel-agencies', slug: 'travel-agencies', label: 'Travel Agencies',
    category: 'Travel & Transport', tier: 'tier2', icon: 'Plane',
    tagline: 'Packages that sell themselves and enquiries that never slip.',
    problems: [
      'Travellers comparing agencies online first?',
      'Enquiries going cold after hours?',
      'Your packages not reaching serious planners?',
    ],
    recommendedPlan: 'growth',
    serviceIds: ['website', 'gbp-optimise', 'social', 'blog-content'],
    addOnIds: ['meta-ads-setup', 'email-marketing-setup'],
  },
  {
    id: 'packers-movers', slug: 'packers-movers', label: 'Packers & Movers',
    category: 'Travel & Transport', tier: 'tier1', icon: 'Truck',
    tagline: 'Move requests and quotes booked in seconds.',
    problems: [
      'Customers asking for quotes on WhatsApp?',
      'Requests scattered across calls and DMs?',
      'Your reliability not visible to new customers?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'reviews'],
    addOnIds: ['delivery-tracking'],
  },

  // --- Repairs & Maintenance ---
  {
    id: 'mobile-repair', slug: 'mobile-repair', label: 'Mobile & Electronics Repair',
    category: 'Repairs & Maintenance', tier: 'tier1', icon: 'Smartphone',
    tagline: 'Drop-off slots and status updates on WhatsApp.',
    problems: [
      'Customers calling to check repair status?',
      'Walk-ins hard to manage over calls?',
      'Your shop not ranking for "repair near me"?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'reviews'],
    addOnIds: ['qr-suite'],
  },
  {
    id: 'ac-appliance-repair', slug: 'ac-appliance-repair', label: 'AC & Appliance Repair',
    category: 'Repairs & Maintenance', tier: 'tier1', icon: 'Snowflake',
    tagline: 'Service visits booked and reminders sent automatically.',
    problems: [
      'Emergency calls going to whoever answers first?',
      'Service visits hard to schedule?',
      'Your work and reviews not visible?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'appointment-booking'],
    addOnIds: ['sms-marketing'],
  },
  {
    id: 'pest-control', slug: 'pest-control', label: 'Pest Control',
    category: 'Repairs & Maintenance', tier: 'tier1', icon: 'Bug',
    tagline: 'AMC renewals and bookings that keep clients coming back.',
    problems: [
      'Customers forgetting repeat treatments?',
      'Bookings scattered across calls?',
      'Nearby customers can\'t find you online?',
    ],
    recommendedPlan: 'launch',
    serviceIds: ['website', 'gbp', 'whatsapp', 'appointment-booking'],
    addOnIds: ['sms-marketing'],
  },
]

export function getBusinesses(): ResolvedBusiness[] {
  return BUSINESS_TYPES.map((b) => {
    const bundle = resolveServiceBundle(b.serviceIds, b.addOnIds)
    return { ...b, services: bundle.services, addOns: bundle.addOns, pricing: bundle.pricing }
  })
}

export function getBusinessBySlug(slug: string): ResolvedBusiness | undefined {
  return getBusinesses().find((b) => b.slug === slug)
}
