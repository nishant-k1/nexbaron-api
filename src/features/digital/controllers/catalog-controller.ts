import { Request, Response } from 'express'
import { stringParam } from '../../../utils/route-param'
import { nexbaronPublicEngineeringServices } from '../catalog/service-areas/engineering'
import { nexbaronPublicDigitalMarketingServices } from '../catalog/service-areas/marketing'
import servicePricingPlans, {
  type PublicPlanServiceRef,
  annualPrice,
} from '../catalog/plans'
import { getCanonicalPublicServiceSections, getCanonicalPublicServices } from '../catalog/service-sections'
import {
  BUSINESS_CATEGORIES,
  getBusinesses as getAllBusinesses,
  getBusinessBySlug,
} from '../catalog/service-industries'
import { DIGITAL_BUSINESS_PROFILE } from '../catalog/business-profile'

const publicServiceDefinitions: Record<
  string,
  Record<string, Record<string, string>>
> = {
  engineering: nexbaronPublicEngineeringServices,
  digitalMarketing: nexbaronPublicDigitalMarketingServices,
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function getServiceId(entry: PublicPlanServiceRef): string {
  return `${toKebabCase(entry.domain)}-${toKebabCase(entry.category)}-${toKebabCase(entry.service)}`
}

function getServiceLabel(entry: PublicPlanServiceRef): string {
  const label =
    publicServiceDefinitions[entry.domain]?.[entry.category]?.[entry.service]

  if (!label) {
    throw new Error(
      `Unknown public service reference: ${entry.domain}.${entry.category}.${entry.service}`,
    )
  }

  return label
}

function formatScopeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatScopeValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included'
  return String(value)
}

function describeScope(scope?: Record<string, unknown>): string | undefined {
  if (!scope || Object.keys(scope).length === 0) return undefined

  return Object.entries(scope)
    .map(([key, value]) => `${formatScopeKey(key)}: ${formatScopeValue(value)}`)
    .join(' · ')
}

function buildCatalogPlans() {
  return Object.entries(servicePricingPlans).map(([id, plan]: [string, typeof servicePricingPlans[string]]) => {
    const services = plan.services.map((entry) => ({
      id: getServiceId(entry),
      label: getServiceLabel(entry),
      description: describeScope(entry.scope),
      domain: entry.domain,
      category: entry.category,
      service: entry.service,
      scope: entry.scope,
      items: [],
    }))

    const featureServices = plan.features
      ? plan.features.map((label) => ({
          id: toKebabCase(label),
          label,
          items: [],
        }))
      : []

    const includedId = plan.includes?.[0]
    const includedName = includedId
      ? servicePricingPlans[includedId]?.name
      : undefined

    return {
      id,
      name: plan.name,
      tagline: plan.tagline,
      timeline: plan.timeline,
      icon: plan.icon,
      featured: plan.featured,
      inherited: includedName
        ? { label: `Everything in ${includedName}` }
        : undefined,
      inheritsFrom: includedId,
      services: [...services, ...featureServices],
      addOns: [],
      ctaLabel: plan.ctaLabel,
      timelineMode: plan.timelineMode,
      foundationDays: plan.foundationDays,
      pricing: plan.pricing
        ? { ...plan.pricing, annual: annualPrice(plan.pricing) }
        : undefined,
    }
  })
}

export function getCatalog(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '5.0.0',
    updatedAt: '2026-08-16T00:00:00.000Z',
    currency: 'INR',
    disclaimer:
      'One-time setup + monthly care. Prices include GST. Ad budgets (Google/Meta) are billed separately.',
    plans: buildCatalogPlans(),
  })
}

export function getServices(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    sections: getCanonicalPublicServiceSections(),
    services: getCanonicalPublicServices(),
  })
}

export function getBusinesses(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({
    version: '1.0.0',
    categories: BUSINESS_CATEGORIES,
    businesses: getAllBusinesses(),
  })
}

export function getBusinessBySlugHandler(req: Request, res: Response) {
  const slug = stringParam(req, 'slug')
  if (!slug) {
    res.status(400).json({ success: false, message: 'Invalid slug' })
    return
  }
  const business = getBusinessBySlug(slug)
  if (!business) {
    res.status(404).json({ success: false, message: 'Business not found' })
    return
  }
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, business })
}

export function getBusinessProfile(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=900')
  res.json({ success: true, profile: DIGITAL_BUSINESS_PROFILE })
}
