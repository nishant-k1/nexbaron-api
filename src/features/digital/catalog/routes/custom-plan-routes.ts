import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../../../admin/middleware/require-admin'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'
import { randomUUID } from 'crypto'

export const customPlanAdminRouter = Router()

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
    const services = (Array.isArray(body.services) ? body.services : []).map((s: any) => ({
      id: s.id || randomUUID(),
      service: { label: String(s.label || s.service?.label || '') },
      price: Number(s.price) || 0,
      billingCycle: ['monthly', 'annual'].includes(s.billingCycle) ? s.billingCycle : 'setup' as const,
      unitLabel: s.unitLabel || undefined,
    }))
    const addOns = (Array.isArray(body.addOns) ? body.addOns : []).map((a: any) => ({
      id: a.id || randomUUID(),
      service: { label: String(a.label || a.service?.label || '') },
      price: Number(a.price) || 0,
      billingCycle: ['monthly', 'annual'].includes(a.billingCycle) ? a.billingCycle : 'setup' as const,
      unitLabel: a.unitLabel || undefined,
    }))
    const { CustomPlan } = getDivisionModels(req.staffAuth.division)
    const plan = await CustomPlan.create({
      division: req.staffAuth.division,
      name,
      services,
      addOns,
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
    const plan = await CustomPlan.findById(req.params.id)
    if (!plan || plan.division !== req.staffAuth.division) {
      res.status(404).json({ success: false, message: 'Plan not found' })
      return
    }
    if (typeof body.name === 'string') plan.name = String(body.name).trim()
    if (Array.isArray(body.services)) {
      plan.services = body.services.map((s: any) => ({
        id: s.id || randomUUID(),
        service: { label: String(s.label || s.service?.label || '') },
        price: Number(s.price) || 0,
        billingCycle: ['monthly', 'annual'].includes(s.billingCycle) ? s.billingCycle : 'setup' as const,
        unitLabel: s.unitLabel || undefined,
      }))
      plan.markModified('services')
    }
    if (Array.isArray(body.addOns)) {
      plan.addOns = body.addOns.map((a: any) => ({
        id: a.id || randomUUID(),
        service: { label: String(a.label || a.service?.label || '') },
        price: Number(a.price) || 0,
        billingCycle: ['monthly', 'annual'].includes(a.billingCycle) ? a.billingCycle : 'setup' as const,
        unitLabel: a.unitLabel || undefined,
      }))
      plan.markModified('addOns')
    }
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
