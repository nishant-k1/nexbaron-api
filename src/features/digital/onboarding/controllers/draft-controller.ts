import { Request, Response } from 'express'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'

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

// Load the draft for the current user + division.
export async function getDraft(req: Request, res: Response) {
  try {
    const division = req.division!
    const { OnboardingDraft } = getDivisionModels(division)
    const draft = await OnboardingDraft.findOne({ userId: req.userId, division })
    if (!draft) {
      res.status(200).json({ success: true, draft: null })
      return
    }
    res.status(200).json({
      success: true,
      draft: {
        planId: draft.planId,
        planSelection: draft.planSelection,
        plans: plansToObject(draft.plans as unknown as Map<string, DraftPlanState>),
        fields: draft.fields,
        step: draft.step,
        updatedAt: draft.updatedAt,
      },
    })
  } catch (error) {
    logger.error('getDraft error:', error)
    res.status(500).json({ success: false, message: 'Failed to load draft' })
  }
}

// Create or fully replace the draft for the current user + division.
export async function upsertDraft(req: Request, res: Response) {
  try {
    const division = req.division!
    const { planId, planSelection, plans, fields, step } = req.body

    if (!planId && !fields) {
      res.status(400).json({ success: false, message: 'Nothing to save' })
      return
    }

    const { OnboardingDraft } = getDivisionModels(division)
    const draft = await OnboardingDraft.findOneAndUpdate(
      { userId: req.userId, division },
      {
        $set: {
          ...(planId !== undefined ? { planId } : {}),
          ...(planSelection !== undefined ? { planSelection } : {}),
          ...(plans !== undefined ? { plans } : {}),
          ...(fields !== undefined ? { fields } : {}),
          ...(step !== undefined ? { step } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    res.status(200).json({
      success: true,
      draft: {
        planId: draft.planId,
        planSelection: draft.planSelection,
        plans: plansToObject(draft.plans as unknown as Map<string, DraftPlanState>),
        fields: draft.fields,
        step: draft.step,
        updatedAt: draft.updatedAt,
      },
    })
  } catch (error) {
    logger.error('upsertDraft error:', error)
    res.status(500).json({ success: false, message: 'Failed to save draft' })
  }
}

// Reset the plan selection but keep the entered fields (fresh start on pricing).
export async function resetPlan(req: Request, res: Response) {
  try {
    const division = req.division!
    const { OnboardingDraft } = getDivisionModels(division)
    const draft = await OnboardingDraft.findOneAndUpdate(
      { userId: req.userId, division },
      {
        $set: {
          planId: '',
          planSelection: { selected: [], addOns: [], addOnCounts: {}, inheritedOn: true },
          plans: {},
          step: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    res.status(200).json({
      success: true,
      draft: {
        planId: draft.planId,
        planSelection: draft.planSelection,
        plans: plansToObject(draft.plans as unknown as Map<string, DraftPlanState>),
        fields: draft.fields,
        step: draft.step,
        updatedAt: draft.updatedAt,
      },
    })
  } catch (error) {
    logger.error('resetPlan error:', error)
    res.status(500).json({ success: false, message: 'Failed to reset plan' })
  }
}
