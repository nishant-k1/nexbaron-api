import { IOrderItem } from "../../../../models/order.model";
import servicePricingPlans, {
  annualPrice,
} from "../../catalog/plans/v1/plans-type";

export interface PlanSelectionInput {
  selected: string[];
  addOns: string[];
  addOnCounts: Record<string, number>;
  inheritedOn: boolean;
}

export interface SelectionsInput {
  planId: string;
  plans: Record<string, PlanSelectionInput>;
}

export type BillingCycleChoice = "monthly" | "annual";

export interface GstSplit {
  taxable: number;
  cgst: number;
  sgst: number;
  total: number;
}

// Catalog prices are charged as displayed (GST included). Split the 18% tax
// out of an inclusive total into taxable + CGST/SGST.
export function splitGst(inclusiveTotal: number): GstSplit {
  const taxable = Math.round((inclusiveTotal * 100) / 118);
  const total = inclusiveTotal - taxable;
  const cgst = Math.floor(total / 2);
  const sgst = total - cgst;
  return { taxable, cgst, sgst, total };
}

export interface ComputedOrder {
  planId: string;
  planName: string;
  billingCycle: BillingCycleChoice;
  amount: number;
  setupTotal: number;
  monthlyTotal: number;
  annualTotal: number;
  gst: GstSplit;
  items: IOrderItem[];
  launchDays: number;
  launchDate: Date;
  timelineMode?: "phased";
}

const LAUNCH_FIXED_DAYS = 4;

export function computeOrder(
  selections: SelectionsInput,
  billingCycle: BillingCycleChoice = "monthly",
  from = new Date(),
): ComputedOrder {
  const chosenId = selections.planId;
  const chosenPlan = servicePricingPlans[chosenId];
  if (!chosenPlan) throw new Error(`Unknown plan: ${chosenId}`);

  const pricing = chosenPlan.pricing;
  const setupTotal = pricing?.setup ?? 0;
  const monthlyTotal = pricing?.monthly ?? 0;
  const annualTotal = pricing ? annualPrice(pricing) : 0;

  // Annual: the discounted care (10 months) is billed upfront alongside the
  // setup fee; monthly bills setup + the first month.
  const amount =
    billingCycle === "annual"
      ? setupTotal + annualTotal
      : setupTotal + monthlyTotal;

  const items: IOrderItem[] = [];
  if (setupTotal > 0) {
    items.push({
      kind: "plan",
      planId: chosenId,
      label: `${chosenPlan.name} — setup`,
      billingCycle: "setup",
      price: setupTotal,
      quantity: 1,
    });
  }
  if (billingCycle === "monthly" && monthlyTotal > 0) {
    items.push({
      kind: "plan",
      planId: chosenId,
      label: `${chosenPlan.name} — monthly care`,
      billingCycle: "monthly",
      price: monthlyTotal,
      quantity: 1,
    });
  }
  if (billingCycle === "annual" && annualTotal > 0) {
    items.push({
      kind: "plan",
      planId: chosenId,
      label: `${chosenPlan.name} — annual care`,
      billingCycle: "annual",
      price: annualTotal,
      quantity: 1,
    });
  }

  const phased = chosenPlan.timelineMode === "phased";
  const launchDays = phased
    ? (chosenPlan.foundationDays ?? 30)
    : LAUNCH_FIXED_DAYS;
  const launchDate = new Date(from);
  launchDate.setDate(launchDate.getDate() + launchDays);

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
  };
}

export function buildLaunchStages(launchDays: number) {
  const buildEnd = Math.max(2, launchDays - 3);
  const reviewStart = buildEnd + 1;
  return [
    {
      key: "payment",
      label: "You book & pay online",
      dayLabel: "Today",
      endDay: 0,
    },
    {
      key: "kickoff",
      label: "Kickoff & content",
      dayLabel: "Day 1",
      endDay: 1,
    },
    {
      key: "build",
      label: "Design & setup",
      dayLabel: launchDays <= 4 ? `Days 2–${launchDays}` : `Days 2–${buildEnd}`,
      endDay: buildEnd,
    },
    {
      key: "review",
      label: "Review & revisions",
      dayLabel: `Days ${reviewStart}–${launchDays - 1}`,
      endDay: launchDays - 1,
    },
    {
      key: "launch",
      label: "Go live",
      dayLabel: `Day ${launchDays}`,
      endDay: launchDays,
    },
  ];
}
