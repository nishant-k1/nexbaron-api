import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { pipelineOverview, sourcePerformance, teamWorkload, revenueReport, bottleneckAnalysis } from '../controllers/report-controller'

export const reportRouter = Router()

reportRouter.get('/reports/pipeline', requireAdmin, requireDivision('digital', 'print'), pipelineOverview)
reportRouter.get('/reports/sources', requireAdmin, requireDivision('digital', 'print'), sourcePerformance)
reportRouter.get('/reports/workload', requireAdmin, requireDivision('digital', 'print'), teamWorkload)
reportRouter.get('/reports/revenue', requireAdmin, requireDivision('digital', 'print'), revenueReport)
reportRouter.get('/reports/bottlenecks', requireAdmin, requireDivision('digital', 'print'), bottleneckAnalysis)
