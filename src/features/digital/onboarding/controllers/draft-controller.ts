import { Request, Response } from 'express'
import { loadDraft, saveDraft, resetDraftPlan } from '../services/draft-service'
import { logger } from '../../../../utils/logger'

export async function getDraft(req: Request, res: Response) {
  try {
    const draft = await loadDraft(req.userId!, req.division!)
    res.status(200).json({ success: true, draft })
  } catch (error) {
    logger.error('getDraft error:', error)
    res.status(500).json({ success: false, message: 'Failed to load draft' })
  }
}

export async function upsertDraft(req: Request, res: Response) {
  try {
    const division = req.division!
    const { planId, fields } = req.body

    if (!planId && !fields) {
      res.status(400).json({ success: false, message: 'Nothing to save' })
      return
    }

    const draft = await saveDraft(req.userId!, division, req.body)
    res.status(200).json({ success: true, draft })
  } catch (error) {
    logger.error('upsertDraft error:', error)
    res.status(500).json({ success: false, message: 'Failed to save draft' })
  }
}

export async function resetPlan(req: Request, res: Response) {
  try {
    const draft = await resetDraftPlan(req.userId!, req.division!)
    res.status(200).json({ success: true, draft })
  } catch (error) {
    logger.error('resetPlan error:', error)
    res.status(500).json({ success: false, message: 'Failed to reset plan' })
  }
}
