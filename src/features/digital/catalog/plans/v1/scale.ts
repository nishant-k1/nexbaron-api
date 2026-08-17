import type { PlanFeature } from "./plans-type";

const features: PlanFeature[] = [
  {
    label: "Expanded Pages",
    description:
      "Up to 15 standard pages + 5 Additional Location Pages for SEO",
    scope: "15 standard + 5 location pages",
  },
  {
    label: "Advanced SEO",
    description: "Advanced SEO setup",
    inclusions: [
      "Technical SEO review",
      "Indexation review",
      "Core Web Vitals review",
      "Internal linking strategy",
      "Structured data optimization",
      "Canonical configuration",
      "Open Graph metadata setup",
      "XML sitemap review",
      "Robots.txt review",
      "Redirect review",
    ],
    exclusions: [
      "Search ranking guarantees",
      "Backlink acquisition",
      "Ongoing link building",
    ],
  },
  {
    label: "Custom Forms",
    description: "Up to 2 additional custom forms",
    scope: "2 additional forms",
  },
  {
    label: "Google Conversion Tracking",
    description: "Google conversion tracking setup",
    scope: "3 conversion actions",
    inclusions: [
      "Conversion action configuration",
      "Event tracking implementation",
      "Contact form submission tracking",
      "WhatsApp click tracking",
      "Phone call click tracking",
    ],
  },
  {
    label: "Meta Conversion Tracking",
    description: "Meta conversion tracking setup",
    scope: "up to 3 conversion actions",
    inclusions: [
      "Meta Pixel setup",
      "Conversion event configuration",
      "Event tracking implementation",
    ],
  },
  {
    label: "Lead Management",
    description: "Basic lead management system",
    scope: "1 lead pipeline",
    inclusions: [
      "Lead database",
      "Website form lead capture",
      "Lead status management",
      "Lead details",
      "Lead search and filtering",
      "Basic lead dashboard",
    ],
    exclusions: [
      "Advanced CRM functionality",
      "Multi-user role management",
      "Custom workflow development",
      "Manual lead management by Nexbaron",
      "Third-party CRM integration",
    ],
  },
  {
    label: "Lead Follow-up Automation",
    description: "Automated lead follow-up through email",
    inclusions: [
      "Email follow-up workflow",
      "Lead follow-up trigger configuration",
      "1 workflow with up to 3 follow-up emails",
    ],
    scope: "1 follow-up workflow",
  },
  {
    label: "Local Citations",
    description: "Local Citation Setup - up to 5 relevant business directories",
    scope: "up to 5 directories",
  },
  {
    label: "Social Media Posts",
    description:
      "Social Media Post Creation & Publishing — 4 graphic posts and 2 shorts per month",
    scope: "4 graphic posts + 2 shorts/month",
  },
];

export default {
  name: "Scale",
  tagline: "Build systems that help you manage and automate growth.",
  timeline: "Monthly scale plan",
  icon: "Building2",
  ctaLabel: "Choose Scale",
  includes: ["growth"],
  timelineMode: "phased" as const,
  foundationDays: 30,
  pricing: {
    setup: 59999,
    monthly: 5999,
    annual: 59990,
    minimumMonths: 3,
    annualDiscount: "Pay for 10 months, get 12 months of service.",
  },
  features,
};
