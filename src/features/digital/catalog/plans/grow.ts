import type { PlanFeature } from "../plans-type";

const features: PlanFeature[] = [
  {
    label: "All Launch Features",
    description: "Everything included in Launch",
  },
  {
    label: "Expanded Pages",
    description: "Up to 10 standard pages + 2 location pages",
    scope: "10 standard + 2 location pages",
  },
  {
    label: "Accessibility, Performance and Best Practices Optimization",
    description:
      "Website accessibility, performance and best practices optimization",
    inclusions: [
      "Accessibility audit and improvements",
      "Performance optimization for faster loading",
      "Mobile responsiveness enhancements",
      "Best practices implementation for web development",
      "Optimized images",
      "Lazy loading",
      "Sensible asset loading",
      "Code splitting where applicable",
      "Basic caching",
      "Avoiding obvious performance problems",
    ],
  },
  {
    label: "Custom Forms",
    description: "1 additional custom form",
    scope: "1 additional form",
  },
  {
    label: "Live Chat",
    description: "Live chat widget setup and website integration",
  },
  {
    label: "On-Page SEO",
    description: "On-page SEO optimization for up to 10 pages",
    scope: "up to 10 pages",
    inclusions: [
      "Keyword targeting",
      "Title and meta optimization",
      "Heading optimization",
      "Image alt text",
      "URL optimization",
      "Internal linking",
      "Content optimization recommendations",
    ],
    exclusions: [
      "Search ranking guarantees",
      "Backlink acquisition",
      "Ongoing link building",
    ],
  },
  {
    label: "Schema Markup",
    description: "Schema markup implementation for eligible website pages",
    scope: "Eligible pages within Growth scope",
  },
  {
    label: "Conversion Tracking",
    description: "Google conversion tracking setup",
    scope: "3 conversion actions",
    inclusions: [
      "Google Tag Manager setup",
      "Conversion action configuration",
      "Event tracking implementation",
      "Contact form submission tracking",
      "WhatsApp click tracking",
      "Phone call click tracking",
    ],
  },
  {
    label: "Local Citations",
    description: "Local Citation Setup — up to 2 relevant business directories",
    scope: "up to 2 directories",
  },

  {
    label: "Social Media Posts",
    description:
      "Social Media Post Creation & Publishing — 2 graphic posts and 1 short per month",
    scope: "2 graphic posts + 1 short/month",
    inclusions: [
      "Content creation",
      "Graphic post design",
      "Short-form video creation",
      "Publishing",
    ],
  },
];

export default {
  name: "Growth",
  tagline: "Turn your digital presence into a lead-generation channel",
  timeline: "Monthly growth plan",
  icon: "TrendingUp",
  ctaLabel: "Discuss Growth",
  featured: true,
  includes: ["launch"],
  pricing: {
    setup: 29999,
    monthly: 2999,
    annual: 29990,
    minimumMonths: 3,
    annualDiscount: "Pay for 10 months, get 12 months of service.",
  },
  features,
};
