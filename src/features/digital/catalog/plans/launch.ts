import type { PlanFeature } from "../plans-type";

const features: PlanFeature[] = [
  {
    label: "Expanded Pages",
    description: "Up to 10 standard pages + 2 location pages",
    scope: "7 standard + 1 location page",
  },
  {
    label: "Basic Performance Optimization",
    description: "Basic Website performance optimization",
    inclusions: [
      "Performance review",
      "Basic caching configuration",
      "Image optimization",
      "Asset loading optimization",
    ],
  },
  {
    label: "Business Email",
    description: "Business email setup - 1 mailbox",
    scope: "1 mailbox",
    inclusions: [
      "Mailbox setup",
      "Domain email configuration",
      "Email DNS configuration",
    ],
  },
  {
    label: "Google Maps",
    description: "Google Maps location embed on the website",
    scope: "1 business location",
  },
  {
    label: "WhatsApp Chat",
    description: "Floating WhatsApp Chat Button",
    inclusions: [
      "WhatsApp click-to-chat setup",
      "Pre-filled message configuration",
    ],
  },
  {
    label: "On-Page SEO",
    description: "On-page SEO optimization for up to 10 pages",
    scope: "up to 7 pages",
  },
  {
    label: "Website Analytics",
    description: "Google Analytics setup and website measurement",
    inclusions: [
      "Google Analytics setup",
      "Google Tag Manager setup",
      "Website traffic tracking",
      "Basic event tracking",
    ],
  },
  {
    label: "Social Media Posts",
    description: "Social Media Post Creation & Publishing",
    scope: "1 post/month",
  },
];

export default {
  name: "Launch",
  tagline: "Build a professional digital presence.",
  timeline: "Typically 7–14 business days",
  icon: "Rocket",
  ctaLabel: "Discuss Launch",
  includes: ["starter"],
  pricing: {
    setup: 14999,
    monthly: 999,
    annual: 9990,
    minimumMonths: 3,
    annualDiscount: "Pay for 10 months, get 12 months of service.",
  },
  features,
};
