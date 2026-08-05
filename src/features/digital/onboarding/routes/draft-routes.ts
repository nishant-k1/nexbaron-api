import { Router } from 'express'
import { requireAuth } from '../../../../middleware/require-auth'
import { getDraft, upsertDraft, resetPlan } from '../controllers/draft-controller'

export const digitalDraftRouter = Router()

digitalDraftRouter.use(requireAuth)
digitalDraftRouter.get('/', getDraft)
digitalDraftRouter.put('/', upsertDraft)
digitalDraftRouter.post('/reset-plan', resetPlan)
