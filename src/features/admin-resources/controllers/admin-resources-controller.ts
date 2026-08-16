import { Request, Response } from 'express'
import { logger } from '../../../utils/logger'
import { listReminders, dismissReminder } from '../services/reminder-service'
import { listRecurring, createRecurring, updateRecurring } from '../services/recurring-service'
import { listTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../services/testimonial-service'

export async function getReminders(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const sent = req.query.sent === 'true'
    const type = req.query.type as string | undefined
    const reminders = await listReminders(req.staffAuth.division, { sent, type })
    res.json({ success: true, reminders })
  } catch (error) {
    logger.error('listReminders failed', error)
    res.status(500).json({ success: false, message: 'Failed to load reminders' })
  }
}

export async function dismissReminderById(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    await dismissReminder(req.staffAuth.division, String(req.params.id))
    res.json({ success: true })
  } catch (error) {
    logger.error('dismissReminder failed', error)
    res.status(500).json({ success: false, message: 'Failed to dismiss reminder' })
  }
}

export async function getRecurring(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const services = await listRecurring(req.staffAuth.division, {
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
    })
    res.json({ success: true, services })
  } catch (error) {
    logger.error('listRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to load recurring services' })
  }
}

export async function postRecurring(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    if (!body.orderId || !body.description || !body.amount) {
      res.status(400).json({ success: false, message: 'orderId, description, and amount are required' })
      return
    }
    const service = await createRecurring(req.staffAuth.division, body)
    res.status(201).json({ success: true, service })
  } catch (error) {
    logger.error('createRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to create recurring service' })
  }
}

export async function patchRecurring(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const service = await updateRecurring(req.staffAuth.division, String(req.params.id), req.body ?? {})
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' })
      return
    }
    res.json({ success: true, service })
  } catch (error) {
    logger.error('updateRecurring failed', error)
    res.status(500).json({ success: false, message: 'Failed to update recurring service' })
  }
}

export async function getTestimonials(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const testimonials = await listTestimonials(req.staffAuth.division, {
      approved: req.query.approved as string | undefined,
      tag: req.query.tag as string | undefined,
    })
    res.json({ success: true, testimonials })
  } catch (error) {
    logger.error('listTestimonials failed', error)
    res.status(500).json({ success: false, message: 'Failed to load testimonials' })
  }
}

export async function postTestimonial(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    if (!body.quote || !body.author?.name) {
      res.status(400).json({ success: false, message: 'quote and author.name are required' })
      return
    }
    const testimonial = await createTestimonial(req.staffAuth.division, body)
    res.status(201).json({ success: true, testimonial })
  } catch (error) {
    logger.error('createTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to create testimonial' })
  }
}

export async function patchTestimonial(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const testimonial = await updateTestimonial(req.staffAuth.division, String(req.params.id), req.body ?? {})
    if (!testimonial) {
      res.status(404).json({ success: false, message: 'Testimonial not found' })
      return
    }
    res.json({ success: true, testimonial })
  } catch (error) {
    logger.error('updateTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to update testimonial' })
  }
}

export async function deleteTestimonialById(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    await deleteTestimonial(req.staffAuth.division, String(req.params.id))
    res.json({ success: true })
  } catch (error) {
    logger.error('deleteTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to delete testimonial' })
  }
}
