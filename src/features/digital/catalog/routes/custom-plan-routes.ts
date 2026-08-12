import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../../../admin/middleware/require-admin'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'
import { allServices, computeServiceAggregate, resolveServiceBundle } from '../catalog-master'

export const customPlanAdminRouter = Router()

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map(String).filter(Boolean))] : []
}

// Master catalog — the rep browses every service to build a custom plan.
customPlanAdminRouter.get('/master-services', requireAdmin, requireDivision('digital'), async (_req, res) => {
  try {
    const services = Object.values(allServices).map((svc) => {
      const clone = structuredClone(svc)
      clone.aggregate = computeServiceAggregate(svc)
      return clone
    })
    res.json({ success: true, services })
  } catch (error) {
    logger.error('listMasterServices failed', error)
    res.status(500).json({ success: false, message: 'Failed to load master services' })
  }
})

customPlanAdminRouter.get('/custom-plans', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    const plans = await CustomPlan.find({ division: req.staffAuth.division }).sort({ createdAt: -1 }).lean()
    res.json({ success: true, plans })
  } catch (error) {
    logger.error('listCustomPlans failed', error)
    res.status(500).json({ success: false, message: 'Failed to load custom plans' })
  }
})

customPlanAdminRouter.get('/custom-plans/:id', requireAdmin, requireDivision('digital'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    const plan = await CustomPlan.findOne({ _id: req.params.id, division: req.staffAuth.division }).lean()
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' })
      return
    }
    const bundle = resolveServiceBundle(plan.serviceIds, plan.addOnIds)
    res.json({ success: true, plan: { ...plan, ...bundle } })
  } catch (error) {
    logger.error('getCustomPlan failed', error)
    res.status(500).json({ success: false, message: 'Failed to load plan' })
  }
})

customPlanAdminRouter.post('/custom-plans', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const name = String(body.name || '').trim()
    if (!name) {
      res.status(400).json({ success: false, message: 'Plan name is required' })
      return
    }
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    const plan = await CustomPlan.create({
      division: req.staffAuth.division,
      name,
      serviceIds: stringList(body.serviceIds),
      addOnIds: stringList(body.addOnIds),
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() || undefined : undefined,
      status: body.status === 'shared' ? 'shared' : 'draft',
    })
    res.status(201).json({ success: true, plan })
  } catch (error) {
    logger.error('createCustomPlan failed', error)
    res.status(500).json({ success: false, message: 'Failed to create plan' })
  }
})

customPlanAdminRouter.patch('/custom-plans/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    const plan = await CustomPlan.findOne({ _id: req.params.id, division: req.staffAuth.division })
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' })
      return
    }
    if (typeof body.name === 'string') plan.name = String(body.name).trim()
    if (Array.isArray(body.serviceIds)) {
      plan.serviceIds = stringList(body.serviceIds)
      plan.markModified('serviceIds')
    }
    if (Array.isArray(body.addOnIds)) {
      plan.addOnIds = stringList(body.addOnIds)
      plan.markModified('addOnIds')
    }
    if (typeof body.customerEmail === 'string') {
      plan.customerEmail = body.customerEmail.trim().toLowerCase() || undefined
    }
    if (body.status === 'draft' || body.status === 'shared') plan.status = body.status
    await plan.save()
    res.json({ success: true, plan })
  } catch (error) {
    logger.error('updateCustomPlan failed', error)
    res.status(500).json({ success: false, message: 'Failed to update plan' })
  }
})

customPlanAdminRouter.delete('/custom-plans/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    await CustomPlan.deleteOne({ _id: req.params.id, division: req.staffAuth.division })
    res.json({ success: true })
  } catch (error) {
    logger.error('deleteCustomPlan failed', error)
    res.status(500).json({ success: false, message: 'Failed to delete plan' })
  }
})
