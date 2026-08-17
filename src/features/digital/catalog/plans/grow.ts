import type { PlanFeature } from "../plans-type";

const features: PlanFeature[] = [
  {
    label: "Expanded Pages",
    description: "Up to 10 standard pages + 2 location pages",
    scope: "10 standard + 2 location pages",
  },
  {
    label: "Accessibility & Performance  Optimization",
    description:
      "Website accessibility, performance and best practices optimization",
    inclusions: [
      "Accessibility audit and improvements",
      "Performance optimization",
      "Mobile responsiveness improvements",
      "Image optimization",
      "Lazy loading",
      "Asset loading optimization",
      "Code splitting where applicable",
      "Basic caching configuration",
    ],
  },
  {
    label: "Custom Forms",
    description: "1 additional custom form",
    scope: "1 additional form",
  },
  {
    label: "AI Chatbot",
    description: "AI-powered chatbot for automated customer support",
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
    label: "Local Citations",
    description: "Local Citation Setup — up to 2 relevant business directories",
    scope: "up to 2 directories",
  },
  {
    label: "Google Conversion Tracking",
    description: "Google conversion tracking setup",
    scope: "2 conversion actions",
    inclusions: [
      "Conversion action configuration",
      "Event tracking implementation",
      "Contact form submission tracking",
      "Phone call click tracking",
    ],
  },
  {
    label: "Social Media Posts",
    description:
      "Social Media Post Creation & Publishing — 2 graphic posts and 1 short per month",
    scope: "3 graphic posts + 1 short/month",
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
  ctaLabel: "Choose Growth",
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
