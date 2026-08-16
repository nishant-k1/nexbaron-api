import { Request, Response } from 'express'
import { logger } from '../../../utils/logger'
import {
  computePipelineOverview,
  computeSourcePerformance,
  computeTeamWorkload,
  computeRevenueReport,
  computeBottlenecks,
} from '../services/report-service'

export async function pipelineOverview(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const data = await computePipelineOverview(req.staffAuth.division)
    res.json({ success: true, ...data })
  } catch (error) {
    logger.error('pipelineOverview failed', error)
    res.status(500).json({ success: false, message: 'Failed to load pipeline' })
  }
}

export async function sourcePerformance(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const sources = await computeSourcePerformance(req.staffAuth.division)
    res.json({ success: true, sources })
  } catch (error) {
    logger.error('sourcePerformance failed', error)
    res.status(500).json({ success: false, message: 'Failed to load source performance' })
  }
}

export async function teamWorkload(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const data = await computeTeamWorkload(req.staffAuth.division)
    res.json({ success: true, ...data })
  } catch (error) {
    logger.error('teamWorkload failed', error)
    res.status(500).json({ success: false, message: 'Failed to load team workload' })
  }
}

export async function revenueReport(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const period = (req.query.period as string) || '30d'
    const daysBack = period === '90d' ? 90 : period === 'all' ? 3650 : 30
    const data = await computeRevenueReport(req.staffAuth.division, daysBack)
    res.json({ success: true, period, ...data })
  } catch (error) {
    logger.error('revenueReport failed', error)
    res.status(500).json({ success: false, message: 'Failed to load revenue report' })
  }
}

export async function bottleneckAnalysis(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const data = await computeBottlenecks(req.staffAuth.division)
    res.json({ success: true, ...data })
  } catch (error) {
    logger.error('bottleneckAnalysis failed', error)
    res.status(500).json({ success: false, message: 'Failed to load bottleneck analysis' })
  }
}
