import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/require-auth'
import { getDraft, upsertDraft, resetPlan } from '../controllers/draft-controller'

export const digitalDraftRouter = Router()

digitalDraftRouter.use(requireAuth)
digitalDraftRouter.get('/:division', getDraft)
digitalDraftRouter.put('/:division', upsertDraft)
digitalDraftRouter.post('/:division/reset-plan', resetPlan)