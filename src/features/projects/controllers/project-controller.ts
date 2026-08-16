import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { randomUUID } from 'crypto'
import { getDivisionModels } from '../../../models/registry'
import { logger } from '../../../utils/logger'
import { escapeRegex } from '../../../utils/regex'
import { computeProjectStage, PIPELINE_STAGES, type PipelineStage } from '../services/pipeline-service'
import { runtimeBrand } from '../../../config/brand'

interface ProjectSummary {
  projectId: string
  stage: PipelineStage
  leadId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  plan?: string
  source: string
  leadStatus: string
  latestQuote: { id: string; status: string; price?: number } | null
  latestOrder: { id: string; status: string; amount: number; amountPaid: number; milestones: { done: number; total: number } } | null
  unreadChats: number
  lastActivity: Date | null
  createdAt: Date
}

export async function getMyProjects(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Lead, Quote, Order, ChatMessage, User } = getDivisionModels(division)
    const user = await User.findById(userId).lean()
    if (!user || user.division !== division) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }

    const searchEmail = user.email?.trim().toLowerCase()
    if (!searchEmail) {
      res.json({ success: true, projects: [], pipeline: {} })
      return
    }

    const leads = await Lead.find({ division, email: searchEmail }).sort({ createdAt: -1 }).lean()
    if (!leads.length) {
      res.json({ success: true, projects: [], pipeline: {} })
      return
    }

    // Backfill projectId for pre-existing leads created before this field existed
    for (const lead of leads) {
      if (!lead.projectId) {
        const pid = randomUUID()
        await Lead.updateOne({ _id: lead._id }, { $set: { projectId: pid } })
        lead.projectId = pid
      }
    }

    const leadIds = leads.map((l) => l._id)
    const leadProjectIds = leads.map((l) => l.projectId).filter(Boolean) as string[]

    const quotes = await Quote.find({ leadId: { $in: leadIds } }).sort({ createdAt: -1 }).lean()
    const orders = await Order.find({ leadId: { $in: leadIds } }).sort({ createdAt: -1 }).lean()

    const projectCounts: Record<string, number> = {}
    for (const pid of leadProjectIds) {
      projectCounts[pid] = await ChatMessage.countDocuments({
        division,
        projectId: pid,
        sender: 'agent',
        isRead: false,
      })
    }

    const projects: ProjectSummary[] = leads.map((lead) => {
      const leadQuotes = quotes.filter((q) => q.leadId?.toString() === lead._id.toString())
      const leadOrders = orders.filter((o) => o.leadId.toString() === lead._id.toString())
      const latestQuote = leadQuotes.length > 0 ? leadQuotes[0] : null
      const latestOrder = leadOrders.length > 0 ? leadOrders[0] : null
      const stage = computeProjectStage(lead.status, latestOrder?.status, latestQuote?.status)

      let lastActivity: Date | null = lead.createdAt
      if (latestOrder?.updatedAt && latestOrder.updatedAt > lastActivity) lastActivity = latestOrder.updatedAt
      if (latestQuote?.updatedAt && latestQuote.updatedAt > lastActivity) lastActivity = latestQuote.updatedAt

      const milestoneDone = latestOrder?.milestones?.filter((m: { status: string }) => m.status === 'done').length ?? 0
      const milestoneTotal = latestOrder?.milestones?.length ?? 0

      return {
        projectId: lead.projectId,
        stage,
        leadId: lead._id.toString(),
        customerName: lead.name,
        customerEmail: lead.email,
        customerPhone: lead.phone,
        plan: lead.plan,
        source: lead.source,
        leadStatus: lead.status,
        latestQuote: latestQuote
          ? { id: latestQuote._id.toString(), status: latestQuote.status, price: latestQuote.response?.price }
          : null,
        latestOrder: latestOrder
          ? {
              id: latestOrder._id.toString(),
              status: latestOrder.status,
              amount: latestOrder.amount,
              amountPaid: latestOrder.amountPaid,
              milestones: { done: milestoneDone, total: milestoneTotal },
            }
          : null,
        unreadChats: projectCounts[lead.projectId] ?? 0,
        lastActivity,
        createdAt: lead.createdAt,
      }
    })

    const pipeline: Record<string, number> = {}
    for (const s of PIPELINE_STAGES) pipeline[s] = 0
    for (const p of projects) pipeline[p.stage]++

    res.json({ success: true, projects, pipeline })
  } catch (error) {
    logger.error('getMyProjects failed', error)
    res.status(500).json({ success: false, message: 'Failed to load projects' })
  }
}

export async function getMyProject(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    const projectId = String(req.params.projectId)
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      res.status(400).json({ success: false, message: 'Invalid project ID' })
      return
    }
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Lead, Quote, Order, ChatMessage, User } = getDivisionModels(division)
    const user = await User.findById(userId).lean()
    if (!user || user.division !== division) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }

    const lead = await Lead.findOne({ division, projectId }).lean()
    if (!lead) {
      res.status(404).json({ success: false, message: 'Project not found' })
      return
    }
    if (lead.email && lead.email.toLowerCase() !== user.email?.toLowerCase()) {
      res.status(403).json({ success: false, message: 'Not your project' })
      return
    }

    const quotes = await Quote.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean()
    const orders = await Order.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean()
    const chat = await ChatMessage.find({ division, projectId }).sort({ createdAt: 1 }).limit(200).lean()
    const stage = computeProjectStage(lead.status, orders[0]?.status, quotes[0]?.status)

    res.json({ success: true, project: { lead, quotes, orders, chat, stage } })
  } catch (error) {
    logger.error('getMyProject failed', error)
    res.status(500).json({ success: false, message: 'Failed to load project' })
  }
}

export async function listProjects(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const status = req.query.status as string | undefined
    const search = (req.query.search as string) || ''
    const stage = req.query.stage as PipelineStage | undefined

    const { Lead, Quote, Order, ChatMessage } = getDivisionModels(division)
    const filter: Record<string, unknown> = { division }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { company: rx }]
    }

    let leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500).lean()

    if (status) {
      leads = leads.filter((l) => l.status === status)
    }

    // Backfill projectId for pre-existing leads
    for (const lead of leads) {
      if (!lead.projectId) {
        const pid = randomUUID()
        await Lead.updateOne({ _id: lead._id }, { $set: { projectId: pid } })
        lead.projectId = pid
      }
    }

    const leadIds = leads.map((l) => l._id)
    const quotes = await Quote.find({ leadId: { $in: leadIds } }).sort({ createdAt: -1 }).lean()
    const orders = await Order.find({ leadId: { $in: leadIds } }).sort({ createdAt: -1 }).lean()

    const leadProjectIds = leads.map((l) => l.projectId).filter(Boolean) as string[]
    const chatAggregate = await ChatMessage.aggregate([
      { $match: { division, projectId: { $in: leadProjectIds }, sender: 'agent', isRead: false } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ])
    const chatCounts: Record<string, number> = {}
    for (const c of chatAggregate) chatCounts[c._id] = c.count

    const allProjects = leads.map((lead) => {
      const leadQuotes = quotes.filter((q) => q.leadId?.toString() === lead._id.toString())
      const leadOrders = orders.filter((o) => o.leadId.toString() === lead._id.toString())
      const latestQuote = leadQuotes.length > 0 ? leadQuotes[0] : null
      const latestOrder = leadOrders.length > 0 ? leadOrders[0] : null
      const computedStage = computeProjectStage(lead.status, latestOrder?.status, latestQuote?.status)

      return {
        projectId: lead.projectId,
        stage: computedStage,
        lead: {
          _id: lead._id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          plan: lead.plan,
          source: lead.source,
          status: lead.status,
          message: lead.message,
          createdAt: lead.createdAt,
        },
        latestQuote: latestQuote
          ? { _id: latestQuote._id, quoteNumber: latestQuote.quoteNumber, status: latestQuote.status, response: latestQuote.response }
          : null,
        latestOrder: latestOrder
          ? { _id: latestOrder._id, status: latestOrder.status, amount: latestOrder.amount, amountPaid: latestOrder.amountPaid, milestones: latestOrder.milestones }
          : null,
        unreadChats: chatCounts[lead.projectId] ?? 0,
      }
    })

    const filtered = stage ? allProjects.filter((p) => p.stage === stage) : allProjects

    const pipeline: Record<string, number> = {}
    for (const s of PIPELINE_STAGES) pipeline[s] = 0
    for (const p of allProjects) pipeline[p.stage]++

    res.json({ success: true, projects: filtered, pipeline })
  } catch (error) {
    logger.error('listProjects failed', error)
    res.status(500).json({ success: false, message: 'Failed to load projects' })
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
        const division = req.staffAuth.division
    const projectId = String(req.params.projectId)
    if (!projectId || projectId === 'undefined' || projectId === 'null') {
      res.status(400).json({ success: false, message: 'Invalid project ID' })
      return
    }
    const { Lead, Quote, Order, ChatMessage } = getDivisionModels(division)

    const lead = await Lead.findOne({ division, projectId }).lean() // getProject
    if (!lead) {
      res.status(404).json({ success: false, message: 'Project not found' })
      return
    }

    const quotes = await Quote.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean()
    const orders = await Order.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean()
    const chat = await ChatMessage.find({ division, projectId }).sort({ createdAt: 1 }).limit(200).lean()
    const stage = computeProjectStage(lead.status, orders[0]?.status, quotes[0]?.status)

    res.json({ success: true, project: { lead, quotes, orders, chat, stage } })
  } catch (error) {
    logger.error('getProject failed', error)
    res.status(500).json({ success: false, message: 'Failed to load project' })
  }
}
