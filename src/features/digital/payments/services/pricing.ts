import { PLAN_CATALOG, enrichCatalog, computeItemSelling, Service } from '../../catalog/service-package-pricing-catalog'
import { IOrderItem } from '../../../../models/order.model'

export interface PlanSelectionInput {
  selected: string[]
  addOns: string[]
  addOnCounts: Record<string, number>
  inheritedOn: boolean
}

export interface SelectionsInput {
  planId: string
  plans: Record<string, PlanSelectionInput>
}

export type BillingCycleChoice = 'monthly' | 'annual'

export interface GstSplit {
  taxable: number
  cgst: number
  sgst: number
  total: number
}

// Catalog prices are charged as displayed (GST included). Split the 18% tax
// out of an inclusive total into taxable + CGST/SGST.
export function splitGst(inclusiveTotal: number): GstSplit {
  const taxable = Math.round((inclusiveTotal * 100) / 118)
  const total = inclusiveTotal - taxable
  const cgst = Math.floor(total / 2)
  const sgst = total - cgst
  return { taxable, cgst, sgst, total }
}

export interface ComputedOrder {
  planId: string
  planName: string
  billingCycle: BillingCycleChoice
  amount: number
  setupTotal: number
  monthlyTotal: number
  annualTotal: number
  gst: GstSplit
  items: IOrderItem[]
  launchDays: number
  launchDate: Date
  timelineMode?: 'phased'
}

const LAUNCH_FIXED_DAYS = 4

function collectItems(
  service: Service,
  quantity: number,
  { kind, planId }: { kind: IOrderItem['kind']; planId: string }
): IOrderItem[] {
  const items: IOrderItem[] = []
  for (const item of service.items) {
    const sell = computeItemSelling(item)

    if (sell.setup > 0) {
      items.push({
        kind,
        planId,
        label: `${service.label} — ${item.label}`,
        billingCycle: 'setup',
        price: sell.setup * quantity,
        costPrice: item.costPrice.setup * quantity,
        quantity,
      })
    }
    if (sell.monthly > 0) {
      items.push({
        kind,
        planId,
        label: `${service.label} — ${item.label}`,
        billingCycle: 'monthly',
        price: sell.monthly * quantity,
        costPrice: item.costPrice.monthly * quantity,
        quantity,
      })
    }
    if (sell.annual > 0) {
      items.push({
        kind,
        planId,
        label: `${service.label} — ${item.label}`,
        billingCycle: 'annual',
        price: sell.annual * quantity,
        costPrice: item.costPrice.annual * quantity,
        quantity,
      })
    }
  }
  return items
}

export function computeOrder(
  selections: SelectionsInput,
  billingCycle: BillingCycleChoice = 'monthly',
  from = new Date()
): ComputedOrder {
  const catalog = enrichCatalog(PLAN_CATALOG)
  const selPlanId = selections.planId
  const chosenIndex = catalog.plans.findIndex((p) => p.id === selPlanId)
  const chosenPlan = catalog.plans[chosenIndex]
  if (!chosenPlan) throw new Error(`Unknown plan: ${selPlanId}`)

  let amount = 0
  let setupTotal = 0
  let monthlyTotal = 0
  let annualTotal = 0
  const items: IOrderItem[] = []

  const timelineServices: { parallel?: boolean; deliverDays?: number }[] = []

  for (let i = 0; i <= chosenIndex; i++) {
    const plan = catalog.plans[i]
    const sel = selections.plans[plan.id] ?? { selected: [], addOns: [], addOnCounts: {}, inheritedOn: true }
    const selected = new Set(sel.selected)
    const chosenAddOns = new Set(sel.addOns)
    const addOnCounts = sel.addOnCounts ?? {}
    // A lower tier is included only when it is a real ancestor of the chosen
    // plan, i.e. every tier between it and the chosen one is `inherited`
    // (Launch ⊂ Growth ⊂ Scale). Standalone tiers (e.g. AI Growth) never pull
    // in lower-tier services.
    const isAncestor = catalog.plans
      .slice(i + 1, chosenIndex + 1)
      .every((p) => p.inherited !== undefined)
    const include = i === chosenIndex || (isAncestor && sel.inheritedOn)
    if (!include) continue

    // Services — `selected` holds the ids the client chose to KEEP (default: all).
    for (const svc of plan.services) {
      const isSelected = selected.has(svc.id)
      if (i === chosenIndex && !isSelected) continue

      for (const x of collectItems(svc, 1, { kind: 'service', planId: plan.id })) {
        items.push(x)
        if (x.billingCycle === 'setup') {
          amount += x.price
          setupTotal += x.price
        } else if (x.billingCycle === 'annual') annualTotal += x.price
        else monthlyTotal += x.price
      }

      if (i === chosenIndex) {
        timelineServices.push(svc)
      } else {
        if (svc.deliverDays !== undefined) timelineServices.push(svc)
      }
    }

    // Add-ons
    for (const addon of plan.addOns) {
      if (!chosenAddOns.has(addon.id)) continue
      const qty = Math.max(1, addOnCounts[addon.id] ?? 1)

      for (const x of collectItems(addon, qty, { kind: 'addon', planId: plan.id })) {
        items.push(x)
        if (x.billingCycle === 'setup') {
          amount += x.price
          setupTotal += x.price
        } else if (x.billingCycle === 'annual') annualTotal += x.price
        else monthlyTotal += x.price
      }

      for (let c = 0; c < qty; c++) {
        timelineServices.push(addon)
      }
    }
  }

  // Annual: the discounted care is billed upfront alongside the build fee; the
  // monthlies are deferred to month 2. Setup stays in every charge.
  if (billingCycle === 'annual') amount = setupTotal + annualTotal

  // Critical path: sum deliverDays for non-parallel items
  const critical = timelineServices
    .filter((s) => !s.parallel && (s.deliverDays ?? 0) > 0)
    .reduce((sum, s) => sum + (s.deliverDays ?? 0), 0)

  const phased = chosenPlan.timelineMode === 'phased'
  const launchDays = phased ? chosenPlan.foundationDays ?? 30 : Math.max(1, Math.round(LAUNCH_FIXED_DAYS + critical))
  const launchDate = new Date(from)
  launchDate.setDate(launchDate.getDate() + launchDays)

  return {
    planId: chosenPlan.id,
    planName: chosenPlan.name,
    billingCycle,
    amount,
    setupTotal,
    monthlyTotal,
    annualTotal,
    gst: splitGst(amount),
    items,
    launchDays,
    launchDate,
    timelineMode: chosenPlan.timelineMode,
  }
}

export function buildLaunchStages(launchDays: number) {
  const buildEnd = Math.max(2, launchDays - 3)
  const reviewStart = buildEnd + 1
  return [
    {
      key: 'payment',
      label: 'You book & pay online',
      dayLabel: 'Today',
      endDay: 0,
    },
    {
      key: 'kickoff',
      label: 'Kickoff & content',
      dayLabel: 'Day 1',
      endDay: 1,
    },
    {
      key: 'build',
      label: 'Design & setup',
      dayLabel: launchDays <= 4 ? `Days 2–${launchDays}` : `Days 2–${buildEnd}`,
      endDay: buildEnd,
    },
    {
      key: 'review',
      label: 'Review & revisions',
      dayLabel: `Days ${reviewStart}–${launchDays - 1}`,
      endDay: launchDays - 1,
    },
    {
      key: 'launch',
      label: 'Go live',
      dayLabel: `Day ${launchDays}`,
      endDay: launchDays,
    },
  ]
}
