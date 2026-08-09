import { Router } from 'express'
import { requireAdmin, requireDivision } from '../admin/middleware/require-admin'
import { getDivisionModels } from '../models/registry'
import { logger } from '../utils/logger'

export const adminRecurringRouter = Router()

adminRecurringRouter.get('/recurring', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { RecurringService } = getDivisionModels(req.staffAuth.division)
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined
    const filter: Record<string, unknown> = { division: req.staffAuth.division }
    if (status) filter.status = status
    if (type) filter.type = type

    const services = await RecurringService.find(filter).sort({ nextDueDate: 1 }).limit(200).lean()
    res.json({ success: true, services })
  } catch (error) {
    logger.error('listRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to load recurring services' })
  }
})

adminRecurringRouter.post('/recurring', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { RecurringService } = getDivisionModels(req.staffAuth.division)

    if (!body.orderId || !body.description || !body.amount) {
      res.status(400).json({ success: false, message: 'orderId, description, and amount are required' })
      return
    }

    const service = await RecurringService.create({
      division: req.staffAuth.division,
      projectId: body.projectId || '',
      orderId: body.orderId,
      type: body.type || 'maintenance',
      description: String(body.description).trim(),
      frequency: body.frequency || 'monthly',
      amount: Number(body.amount),
      currency: body.currency || 'INR',
      status: body.status || 'active',
      startDate: body.startDate || new Date(),
      nextDueDate: body.nextDueDate || new Date(),
      nextPaymentDate: body.nextPaymentDate || new Date(),
      tasks: body.tasks || [],
      notes: body.notes?.trim() || undefined,
    })

    res.status(201).json({ success: true, service })
  } catch (error) {
    logger.error('createRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to create recurring service' })
  }
})

adminRecurringRouter.patch('/recurring/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { RecurringService } = getDivisionModels(req.staffAuth.division)
    const service = await RecurringService.findById(req.params.id)
    if (!service || service.division !== req.staffAuth.division) {
      res.status(404).json({ success: false, message: 'Service not found' })
      return
    }

    if (body.status) service.status = body.status
    if (body.nextDueDate) service.nextDueDate = new Date(body.nextDueDate)
    if (body.nextPaymentDate) service.nextPaymentDate = new Date(body.nextPaymentDate)
    if (body.amount !== undefined) service.amount = Number(body.amount)
    if (body.description) service.description = String(body.description).trim()
    if (body.notes !== undefined) service.notes = body.notes?.trim() || undefined

    if (Array.isArray(body.tasks)) {
      service.tasks = body.tasks.map((t: any) => ({
        description: String(t.description || ''),
        dueDate: new Date(t.dueDate || Date.now()),
        done: Boolean(t.done),
        completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
      }))
      service.markModified('tasks')
    }

    await service.save()
    res.json({ success: true, service })
  } catch (error) {
    logger.error('updateRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to update recurring service' })
  }
})
