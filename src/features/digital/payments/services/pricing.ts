import { digitalCatalog, CatalogPlan } from '../../catalog/catalog'
import { IOrderItem } from '../../../orders/models/order.model'

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
  oneTimeTotal: number
  monthlyTotal: number
  amount: number
  items: IOrderItem[]
  launchDays: number
  launchDate: Date
  timelineMode?: 'phased'
}

const LAUNCH_FIXED_DAYS = 4

function getPlan(planId: string): CatalogPlan {
  const plan = digitalCatalog.plans.find((p) => p.id === planId)
  if (!plan) throw new Error('Unknown plan')
  return plan
}

export function computeOrder(selections: SelectionsInput, from = new Date()): ComputedOrder {
  const planId = selections.planId
  const planByIndex: { plan: CatalogPlan; oneTimeLive: number }[] = []
  const chosenIndex = digitalCatalog.plans.findIndex((p) => p.id === planId)

  for (const plan of digitalCatalog.plans) {
    const sel = selections.plans[plan.id] ?? { selected: [], addOns: [], addOnCounts: {}, inheritedOn: true }
    const selected = new Set(sel.selected)
    const addOns = new Set(sel.addOns)
    const addOnCounts = sel.addOnCounts ?? {}

    // Removed own services reduce the headline total.
    const ownOffOneTime = plan.services
      .filter((s) => s.type === 'oneTime' && !selected.has(s.id))
      .reduce((sum, s) => sum + s.price, 0)

    let inheritedOneTime = 0
    const lower = planByIndex[planByIndex.length - 1]
    if (lower) {
      const lowerReduction = lower.plan.oneTime - lower.oneTimeLive
      inheritedOneTime = sel.inheritedOn ? lowerReduction : lower.plan.oneTime
    }

    const addOnOneTime = plan.addOns
      .filter((s) => s.type === 'oneTime' && addOns.has(s.id))
      .reduce((sum, s) => sum + s.price * (addOnCounts[s.id] ?? 1), 0)

    const oneTimeLive = Math.max(0, plan.oneTime - ownOffOneTime - inheritedOneTime + addOnOneTime)
    planByIndex.push({ plan, oneTimeLive })
  }

  const chosen = planByIndex[chosenIndex]!
  const chosenSel = selections.plans[planId] ?? { selected: [], addOns: [], addOnCounts: {}, inheritedOn: true }
  const chosenSelected = new Set(chosenSel.selected)

  // Items list (authoritative) for the chosen plan: inherited lower services + own + add-ons.
  const items: IOrderItem[] = []
  for (let i = 0; i <= chosenIndex; i++) {
    const entry = planByIndex[i]!
    const sel = selections.plans[entry.plan.id]
    const selected = new Set(sel?.selected ?? [])
    const addOns = new Set(sel?.addOns ?? [])
    const addOnCounts = sel?.addOnCounts ?? {}
    const includePlan = i === chosenIndex ? true : sel?.inheritedOn ?? true

    if (i < chosenIndex && !includePlan) continue

    for (const s of entry.plan.services) {
      if (i === chosenIndex ? selected.has(s.id) : includePlan) {
        items.push({
          kind: 'service',
          planId: entry.plan.id,
          label: s.label,
          type: s.type,
          price: s.price,
          quantity: 1,
        })
      }
    }
    for (const a of entry.plan.addOns) {
      if (addOns.has(a.id)) {
        items.push({
          kind: 'addon',
          planId: entry.plan.id,
          label: a.label,
          type: a.type,
          price: a.price,
          quantity: Math.max(1, addOnCounts[a.id] ?? 1),
        })
      }
    }
  }

  // Launch timeline from the chosen plan's critical path.
  const services: { parallel?: boolean; deliverDays?: number }[] = []
  for (let i = 0; i <= chosenIndex; i++) {
    const entry = planByIndex[i]!
    const sel = selections.plans[entry.plan.id]
    const selected = new Set(sel?.selected ?? [])
    const addOns = new Set(sel?.addOns ?? [])
    const addOnCounts = sel?.addOnCounts ?? {}
    const include = i === chosenIndex || (sel?.inheritedOn ?? true)
    if (i < chosenIndex && !include) continue
    if (i === chosenIndex) {
      for (const s of entry.plan.services) if (selected.has(s.id)) services.push(s)
      for (const a of entry.plan.addOns) {
        if (addOns.has(a.id)) {
          for (let c = 0; c < Math.max(1, addOnCounts[a.id] ?? 1); c++) services.push(a)
        }
      }
    } else {
      for (const s of entry.plan.services) services.push(s)
    }
  }
  const critical = services
    .filter((s) => !s.parallel && (s.deliverDays ?? 0) > 0)
    .reduce((sum, s) => sum + (s.deliverDays ?? 0), 0)

  const phased = chosen.plan.timelineMode === 'phased'
  const launchDays = phased ? chosen.plan.foundationDays ?? 30 : Math.max(1, Math.round(LAUNCH_FIXED_DAYS + critical))
  const launchDate = new Date(from)
  launchDate.setDate(launchDate.getDate() + launchDays)

  return {
    planId: chosen.plan.id,
    planName: chosen.plan.name,
    oneTimeTotal: chosen.oneTimeLive,
    monthlyTotal: Math.max(0, planByIndex[chosenIndex]!.plan.monthly),
    amount: chosen.oneTimeLive,
    items,
    launchDays,
    launchDate,
    timelineMode: chosen.plan.timelineMode,
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

export { getPlan }