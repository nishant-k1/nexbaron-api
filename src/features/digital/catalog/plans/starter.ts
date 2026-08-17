import type { PlanFeature } from "../plans-type";

const features: PlanFeature[] = [
  {
    label: "Business Website",
    description: "Business website — up to 5 standard pages",
    scope: "up to 5 pages",
    inclusions: [
      "Home page",
      "About Us page",
      "Services/Products page",
      "Contact Us page",
      "1 additional standard page",
      "Standard page layout and design",
      "Responsive design for mobile and tablet",
    ],
  },
  {
    label: "Domain Setup",
    description: "Domain connection and configuration",
    scope: "1 domain",
    inclusions: [
      "Domain connection",
      "DNS configuration",
      "SSL certificate setup",
    ],
  },
  {
    label: "Contact Form",
    description: "Contact/enquiry form",
    scope: "1 standard form",
    inclusions: [
      "Form fields configuration",
      "Form validation",
      "Form submission processing",
      "Email notification to 1 client-provided email address",
    ],
    exclusions: [
      "Email mailbox creation",
      "Business email provider subscription",
      "CRM integration",
      "Lead management",
    ],
  },
  {
    label: "Google Business Profile",
    description: "Google Business Profile creation",
    inclusions: [
      "Profile setup",
      "Business information configuration",
      "Primary category configuration",
    ],
    exclusions: ["Google verification or approval"],
  },
  {
    label: "Basic SEO",
    description: "Basic SEO setup for 5 pages",
    scope: "5 pages",
    inclusions: [
      "Page titles",
      "Meta descriptions",
      "Internal linking",
      "Sitemap and robots configuration",
    ],
  },

  {
    label: "Search Console",
    description: "Google Search Console setup and verification",
    inclusions: [
      "Google Search Console setup",
      "Property verification",
      "Sitemap submission",
    ],
  },
  {
    label: "Social Media Setup",
    description: "Social Media Account Setup — up to 2 platforms",
    scope: "up to 2 platforms",
    inclusions: [
      "Account/profile setup",
      "Profile information configuration",
      "Website and contact information",
      "Profile image and cover image setup",
    ],
  },
];

export default {
  name: "Starter",
  tagline: "A simple website to get your business online and discoverable.",
  timeline: "Typically 5–7 business days",
  icon: "Globe",
  ctaLabel: "Discuss Starter",
  pricing: {
    setup: 8999,
    monthly: 499,
    annual: 4990,
    minimumMonths: 3,
    annualDiscount: "Pay for 10 months, get 12 months of service.",
  },
  features,
};
