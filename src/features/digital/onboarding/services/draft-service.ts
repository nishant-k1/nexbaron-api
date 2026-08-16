import { getDivisionModels } from '../../../../models/registry'

interface DraftPlanState {
  selected: string[]
  addOns: string[]
  addOnCounts: Record<string, number>
  inheritedOn: boolean
}

function plansToObject(plans: Map<string, DraftPlanState> | Record<string, DraftPlanState>): Record<string, DraftPlanState> {
  if (plans instanceof Map) {
    return Object.fromEntries(plans.entries())
  }
  return plans as Record<string, DraftPlanState>
}

function toDraftResponse(draft: any) {
  return {
    planId: draft.planId,
    billingCycle: draft.billingCycle ?? 'monthly',
    planSelection: draft.planSelection,
    plans: plansToObject(draft.plans as unknown as Map<string, DraftPlanState>),
    fields: draft.fields,
    step: draft.step,
    updatedAt: draft.updatedAt,
  }
}

const RESET_DEFAULTS = {
  planId: '',
  billingCycle: 'monthly',
  planSelection: { selected: [], addOns: [], addOnCounts: {}, inheritedOn: true },
  plans: {},
  step: 0,
}

export async function loadDraft(userId: string, division: 'digital' | 'print') {
  const { OnboardingDraft } = getDivisionModels(division)
  const draft = await OnboardingDraft.findOne({ userId, division })
  if (!draft) return null
  return toDraftResponse(draft)
}

export async function saveDraft(userId: string, division: 'digital' | 'print', body: Record<string, unknown>) {
  const { planId, billingCycle, planSelection, plans, fields, step } = body
  const normalizedCycle = billingCycle === 'annual' ? 'annual' : 'monthly'

  const { OnboardingDraft } = getDivisionModels(division)
  const draft = await OnboardingDraft.findOneAndUpdate(
    { userId, division },
    {
      $set: {
        ...(planId !== undefined ? { planId } : {}),
        ...(billingCycle !== undefined ? { billingCycle: normalizedCycle } : {}),
        ...(planSelection !== undefined ? { planSelection } : {}),
        ...(plans !== undefined ? { plans } : {}),
        ...(fields !== undefined ? { fields } : {}),
        ...(step !== undefined ? { step } : {}),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  return toDraftResponse(draft)
}

export async function resetDraftPlan(userId: string, division: 'digital' | 'print') {
  const { OnboardingDraft } = getDivisionModels(division)
  const draft = await OnboardingDraft.findOneAndUpdate(
    { userId, division },
    { $set: RESET_DEFAULTS },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )

  return toDraftResponse(draft)
}
