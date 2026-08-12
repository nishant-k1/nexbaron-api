import { PLAN_CATALOG, enrichCatalog, computeItemSelling, Service } from '../../catalog/plan-catalog'
import { IOrderItem } from '../../../../orders/models/order.model'

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

export interface ComputedOrder {
  planId: string
  planName: string
  amount: number
  monthlyTotal: number
  annualTotal: number
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

export function computeOrder(selections: SelectionsInput, from = new Date()): ComputedOrder {
  const catalog = enrichCatalog(PLAN_CATALOG)
  const selPlanId = selections.planId
  const chosenIndex = catalog.plans.findIndex((p) => p.id === selPlanId)
  const chosenPlan = catalog.plans[chosenIndex]
  if (!chosenPlan) throw new Error(`Unknown plan: ${selPlanId}`)

  let amount = 0
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
    const include = i === chosenIndex || sel.inheritedOn
    if (!include) continue

    // Services — `selected` holds the ids the client chose to KEEP (default: all).
    for (const svc of plan.services) {
      const isSelected = selected.has(svc.id)
      if (i === chosenIndex && !isSelected) continue

      for (const x of collectItems(svc, 1, { kind: 'service', planId: plan.id })) {
        items.push(x)
        if (x.billingCycle === 'setup') amount += x.price
        else if (x.billingCycle === 'annual') annualTotal += x.price
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
        if (x.billingCycle === 'setup') amount += x.price
        else if (x.billingCycle === 'annual') annualTotal += x.price
        else monthlyTotal += x.price
      }

      for (let c = 0; c < qty; c++) {
        timelineServices.push(addon)
      }
    }
  }

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
    amount,
    monthlyTotal,
    annualTotal,
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
      label: 'Design & build',
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
