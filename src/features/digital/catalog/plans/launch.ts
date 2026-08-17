import type { PlanFeature } from "../plans-type";

const features: PlanFeature[] = [
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
    label: "WhatsApp Chat",
    description: "Floating WhatsApp Chat Button",
    inclusions: [
      "WhatsApp click-to-chat setup",
      "Pre-filled message configuration",
    ],
  },
  {
    label: "Google Maps",
    description: "Google Maps location embed on the website",
    scope: "1 business location",
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
