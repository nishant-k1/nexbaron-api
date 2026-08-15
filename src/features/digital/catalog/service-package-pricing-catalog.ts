// Plan (package) pricing catalog — the fixed-price plans customers buy.
//
// A plan is a bundle of services (see service-items-pricing-catalog.ts). Each
// plan-def file below lists the plan's OWN services + add-ons; `inherited`
// means "everything in the lower-tier plan is also included" (Launch ⊂ Growth
// ⊂ Scale).
//
// Prices are NEVER hardcoded here. enrichCatalog() sums each plan's services'
// selling prices, cumulatively (Growth = its own + Launch, Scale = its own +
// Growth). To change a plan's price, edit the service items in
// service-items-pricing-catalog.ts, or add/remove services in plan-defs/.
//
// The Custom plan is quote-based — it has no fixed price.

import { launchPlan } from './plan-defs/launch-plan'
import { growthPlan } from './plan-defs/growth-plan'
import { scalePlan } from './plan-defs/scale-plan'
import { customPlan } from './plan-defs/custom-plan'
import {
  enrichCatalog,
  computeItemSelling,
  computeServiceAggregate,
  pickServices,
  SHARED_INFRA,
  SERVICES,
  type PlanCatalog,
  type Plan,
  type Service,
  type ServiceItem,
  type ServiceStage,
  type ServiceAggregate,
  type PlanPricing,
} from './service-items-pricing-catalog'

export const PLAN_CATALOG: PlanCatalog = enrichCatalog({
  version: '4.2.0',
  updatedAt: '2026-08-15T00:00:00.000Z',
  currency: 'INR',
  disclaimer: 'Ad budgets (Google Ads, Meta Ads) are NOT included in any plan price. They are paid directly to the platform by the client.',
  sharedInfra: SHARED_INFRA,
  plans: [launchPlan, growthPlan, scalePlan, customPlan],
})

export { enrichCatalog, computeItemSelling, computeServiceAggregate, pickServices, SERVICES }
export type { PlanCatalog, Plan, Service, ServiceItem, ServiceStage, ServiceAggregate, PlanPricing }
