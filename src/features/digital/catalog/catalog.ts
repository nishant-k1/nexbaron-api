import { launchPlan } from './plans/launch-plan'
import { growthPlan } from './plans/growth-plan'
import { scalePlan } from './plans/scale-plan'
import { customPlan } from './plans/custom-plan'
import {
  enrichCatalog,
  computeItemSelling,
  computeServiceAggregate,
  pickServices,
  sharedInfra,
  allServices,
  type DigitalCatalog,
  type CatalogPlan,
  type CatalogService,
  type ServiceItem,
  type ServiceStage,
  type ServiceAggregate,
  type PlanPricing,
} from './catalog-master'

export const digitalCatalog: DigitalCatalog = enrichCatalog({
  version: '4.1.0',
  updatedAt: '2026-08-12T00:00:00.000Z',
  currency: 'INR',
  disclaimer: 'Ad budgets (Google Ads, Meta Ads) are NOT included in any plan price. They are paid directly to the platform by the client.',
  sharedInfra,
  plans: [launchPlan, growthPlan, scalePlan, customPlan],
})

export { enrichCatalog, computeItemSelling, computeServiceAggregate, pickServices, allServices }
export type { DigitalCatalog, CatalogPlan, CatalogService, ServiceItem, ServiceStage, ServiceAggregate, PlanPricing }
