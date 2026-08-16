import { IOrderItem } from '../../../../models/order.model'
import servicePricingPlans from '../../servicesPlansData/servicePricingPlans'

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

// Resolve the inheritance chain for a plan id (Launch ⊂ Growth ⊂ Scale) by
// following `includes`. Returns the chain from base → chosen plan inclusive.
function collectIncludedIds(targetId: string): string[] {
  const chain: string[] = []
  let currentId: string | undefined = targetId
  while (currentId && servicePricingPlans[currentId]) {
    chain.unshift(currentId)
    currentId = servicePricingPlans[currentId].includes?.[0]
  }
  return chain
}

export function computeOrder(
  selections: SelectionsInput,
  billingCycle: BillingCycleChoice = 'monthly',
  from = new Date()
): ComputedOrder {
  const chosenId = selections.planId
  const chosenPlan = servicePricingPlans[chosenId]
  if (!chosenPlan) throw new Error(`Unknown plan: ${chosenId}`)

  // Prices on each plan are its OWN tier price; inheritance (`includes`) means
  // a higher tier bundles every tier below it, so we sum the whole chain.
  const chain = collectIncludedIds(chosenId)
  let setupTotal = 0
  let monthlyTotal = 0
  let annualTotal = 0
  for (const id of chain) {
    const plan = servicePricingPlans[id]
    if (!plan || plan.custom) continue
    setupTotal += plan.price?.oneTime ?? 0
    monthlyTotal += plan.price?.monthly ?? 0
    annualTotal += plan.price?.annual ?? 0
  }

  // Annual: the discounted care is billed upfront alongside the build fee; the
  // monthlies are deferred to month 2. Setup stays in every charge.
  const amount = billingCycle === 'annual' ? setupTotal + annualTotal : setupTotal + monthlyTotal

  const items: IOrderItem[] = []
  if (setupTotal > 0) {
    items.push({ kind: 'plan', planId: chosenId, label: `${chosenPlan.name} — setup`, billingCycle: 'setup', price: setupTotal, quantity: 1 })
  }
  if (monthlyTotal > 0) {
    items.push({ kind: 'plan', planId: chosenId, label: `${chosenPlan.name} — monthly care`, billingCycle: 'monthly', price: monthlyTotal, quantity: 1 })
  }
  if (annualTotal > 0) {
    items.push({ kind: 'plan', planId: chosenId, label: `${chosenPlan.name} — annual care`, billingCycle: 'annual', price: annualTotal, quantity: 1 })
  }

  const phased = chosenPlan.timelineMode === 'phased'
  const launchDays = phased ? chosenPlan.foundationDays ?? 30 : LAUNCH_FIXED_DAYS
  const launchDate = new Date(from)
  launchDate.setDate(launchDate.getDate() + launchDays)

  return {
    planId: chosenId,
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
