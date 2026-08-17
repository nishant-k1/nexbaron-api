// Source of truth for plan structure + marketing metadata used by the pricing
// page (Launch / Growth / Scale / Custom). Each plan is defined in its own
// file under plans/ with structured feature objects — no dependency on the
// service-areas catalog.

import launch from "./launch";
import starter from "./starter";
import growth from "./grow";
import scale from "./scale";
import custom from "./custom";

export type PlanPricing = {
  setup: number;
  monthly: number;
  minimumMonths?: number;
};

export type PlanFeature = {
  label: string;
  description: string;
  scope?: string;
  inclusions?: string[];
  exclusions?: string[];
};

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
  features?: PlanFeature[];
};

export const ANNUAL_BILLING_MONTHS = 12;

export function annualPrice(pricing: PlanPricing): number {
  return pricing.monthly * ANNUAL_BILLING_MONTHS;
}

const servicePricingPlans: Record<string, PricingPlan> = {
  starter,
  launch,
  growth,
  scale,
  custom,
};

export default servicePricingPlans;
