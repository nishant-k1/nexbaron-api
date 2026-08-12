import { launchPlan } from './plans/launch-plan'
import { growthPlan } from './plans/growth-plan'
import { scalePlan } from './plans/scale-plan'
import { customPlan } from './plans/custom-plan'
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
} from './service-catalog'

export const PLAN_CATALOG: PlanCatalog = enrichCatalog({
  version: '4.1.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  currency: 'INR',
  disclaimer: 'Ad budgets (Google Ads, Meta Ads) are NOT included in any plan price. They are paid directly to the platform by the client.',
  sharedInfra: SHARED_INFRA,
  plans: [launchPlan, growthPlan, scalePlan, customPlan],
})

export { enrichCatalog, computeItemSelling, computeServiceAggregate, pickServices, SERVICES }
export type { PlanCatalog, Plan, Service, ServiceItem, ServiceStage, ServiceAggregate, PlanPricing }
