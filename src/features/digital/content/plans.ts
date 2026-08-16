// Source of truth for plan structure + marketing metadata used by the pricing
// page (Launch / Growth / Scale / Custom). Every plan field the pricing page
// renders lives here — no separate hardcoded copies in the route layer.
//
// Plan services are referenced through typed helpers backed by the canonical
// public service definition files, so an unknown or mistyped service is a
// compile-time error rather than a runtime lookup.

import { nexbaronPublicEngineeringServices } from "./service-areas/engineering";
import { nexbaronPublicDigitalMarketingServices } from "./service-areas/marketing";

type EngineeringCategory = keyof typeof nexbaronPublicEngineeringServices;
type DigitalMarketingCategory =
  keyof typeof nexbaronPublicDigitalMarketingServices;

export type PublicPlanServiceRef =
  | {
      domain: "engineering";
      category: EngineeringCategory;
      service: keyof (typeof nexbaronPublicEngineeringServices)[EngineeringCategory];
      scope?: Record<string, unknown>;
    }
  | {
      domain: "digitalMarketing";
      category: DigitalMarketingCategory;
      service: keyof (typeof nexbaronPublicDigitalMarketingServices)[DigitalMarketingCategory];
      scope?: Record<string, unknown>;
    };

const publicServiceDefinitions: Record<
  string,
  Record<string, Record<string, string>>
> = {
  engineering: nexbaronPublicEngineeringServices,
  digitalMarketing: nexbaronPublicDigitalMarketingServices,
};

export function getPublicServiceLabel(entry: PublicPlanServiceRef): string {
  const label =
    publicServiceDefinitions[entry.domain]?.[entry.category]?.[entry.service];
  if (!label) {
    throw new Error(
      `Unknown public service reference: ${entry.domain}.${entry.category}.${entry.service}`,
    );
  }
  return label;
}

// Each plan's price: a one-time setup fee plus a monthly care fee, with an
// optional minimum commitment. `includes` marks tier inheritance (Launch ⊂
// Growth ⊂ Scale) for the "Everything in X" label — each plan's `pricing` is
// already its full price, not additive across tiers.
export type PlanPricing = {
  setup: number;
  monthly: number;
  minimumMonths?: number;
};

// Annual care is billed as a full year (12 months), no discount.
export const ANNUAL_BILLING_MONTHS = 12;

export function annualPrice(pricing: PlanPricing): number {
  return pricing.monthly * ANNUAL_BILLING_MONTHS;
}

export type PricingPlan = {
  name: string;
  tagline: string;
  timeline: string;
  icon: string;
  ctaLabel: string;
  featured?: boolean;
  timelineMode?: "phased";
  foundationDays?: number;
  includes?: string[];
  pricing?: PlanPricing;
  priceDescription?: { title: string; subtitle: string };
  custom?: boolean;
  services: PublicPlanServiceRef[];
  features?: string[];
};

function engineeringService<C extends EngineeringCategory>(
  category: C,
  service: keyof (typeof nexbaronPublicEngineeringServices)[C],
  scope?: Record<string, unknown>,
): PublicPlanServiceRef {
  return {
    domain: "engineering",
    category,
    service,
    scope,
  } as PublicPlanServiceRef;
}

function digitalMarketingService<C extends DigitalMarketingCategory>(
  category: C,
  service: keyof (typeof nexbaronPublicDigitalMarketingServices)[C],
  scope?: Record<string, unknown>,
): PublicPlanServiceRef {
  return {
    domain: "digitalMarketing",
    category,
    service,
    scope,
  } as PublicPlanServiceRef;
}

const servicePricingPlans: Record<string, PricingPlan> = {
  launch: {
    name: "Launch",
    tagline: "Build a professional online presence for your business.",
    timeline: "Scoped after consultation",
    icon: "Rocket",
    ctaLabel: "Discuss Launch",
    pricing: {
      setup: 4999,
      monthly: 999,
      minimumMonths: 12,
    },

    services: [
      engineeringService("website", "businessWebsite", { pages: 5 }),
      engineeringService("integrations", "whatsappIntegration", {
        type: "contact",
      }),
      engineeringService("analytics", "webAnalytics", { type: "basic" }),
      digitalMarketingService("seo", "googleBusinessProfile", {
        type: "setup",
      }),
    ],
  },

  growth: {
    name: "Growth",
    tagline: "Get found online and turn visibility into enquiries.",
    timeline: "Monthly growth plan",
    icon: "TrendingUp",
    ctaLabel: "Discuss Growth",
    featured: true,
    includes: ["launch"],
    pricing: {
      setup: 4999,
      monthly: 6999,
      minimumMonths: 12,
    },
    services: [
      digitalMarketingService("seo", "seo", { type: "localBusiness" }),
      digitalMarketingService("socialMedia", "socialMediaManagement", {
        postsPerMonth: 8,
      }),
      digitalMarketingService("contentMarketing", "socialMediaCreatives", {
        creativesPerMonth: 8,
      }),
      digitalMarketingService("leadGeneration", "leadGeneration", {
        campaignsPerMonth: 1,
      }),
      digitalMarketingService("analytics", "conversionTracking", {
        type: "standard",
      }),
      digitalMarketingService("analytics", "campaignReporting", {
        frequency: "monthly",
      }),
    ],
  },

  scale: {
    name: "Scale",
    tagline:
      "Scale campaigns, content, and reporting with a dedicated growth system.",
    timeline: "Monthly scale plan",
    icon: "Building2",
    ctaLabel: "Discuss Scale",
    includes: ["growth"],
    timelineMode: "phased",
    foundationDays: 30,
    pricing: {
      setup: 4999,
      monthly: 11999,
      minimumMonths: 12,
    },
    services: [
      digitalMarketingService("paidAdvertising", "googleAds", {
        campaigns: 2,
        remarketing: true,
      }),
      digitalMarketingService("paidAdvertising", "metaAds", {
        campaigns: 2,
        remarketing: true,
      }),
      digitalMarketingService("contentMarketing", "shortFormVideo", {
        videosPerMonth: 4,
      }),
      digitalMarketingService("analytics", "marketingAnalytics", {
        frequency: "monthly",
      }),
    ],
  },

  custom: {
    name: "Custom",
    tagline: "Not finding what you need? Let's build it together.",
    timeline: "We'll scope and quote after consultation",
    icon: "MessageSquare",
    ctaLabel: "Contact Us",
    priceDescription: {
      title: "Let's Talk",
      subtitle: "Not finding what you need? Let's build it together.",
    },
    custom: true,
    services: [],
    features: [
      "Pick services from any plan",
      "Request services not listed above like Custom Software Development — Dashboards, CRMs, Internal Tools",
      "Receive a custom quote within 48h",
    ],
  },
};

export default servicePricingPlans;
