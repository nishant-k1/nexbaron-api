import { Router } from 'express'
import { requireAdmin, requireDivision } from '../admin/middleware/require-admin'
import { getDivisionModels } from '../models/registry'
import { logger } from '../utils/logger'

export const testimonialRouter = Router()

testimonialRouter.get('/testimonials', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Testimonial } = getDivisionModels(req.staffAuth.division)
    const filter: Record<string, unknown> = { division: req.staffAuth.division }
    const approved = req.query.approved
    const tag = req.query.tag as string | undefined

    if (approved === 'true') filter.approved = true
    else if (approved === 'false') filter.approved = false
    if (tag) filter.tags = tag

    const testimonials = await Testimonial.find(filter).sort({ createdAt: -1 }).limit(100).lean()
    res.json({ success: true, testimonials })
  } catch (error) {
    logger.error('listTestimonials failed', error)
    res.status(500).json({ success: false, message: 'Failed to load testimonials' })
  }
})

testimonialRouter.post('/testimonials', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { Testimonial } = getDivisionModels(req.staffAuth.division)

    if (!body.quote || !body.author?.name) {
      res.status(400).json({ success: false, message: 'quote and author.name are required' })
      return
    }

    const testimonial = await Testimonial.create({
      division: req.staffAuth.division,
      projectId: body.projectId || '',
      orderId: body.orderId || '',
      quote: String(body.quote).trim().slice(0, 500),
      author: {
        name: String(body.author.name).trim(),
        company: body.author.company?.trim() || undefined,
        role: body.author.role?.trim() || undefined,
      },
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      approved: Boolean(body.approved),
      source: body.source || 'direct',
    })

    res.status(201).json({ success: true, testimonial })
  } catch (error) {
    logger.error('createTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to create testimonial' })
  }
})

testimonialRouter.patch('/testimonials/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const body = req.body ?? {}
    const { Testimonial } = getDivisionModels(req.staffAuth.division)
    const testimonial = await Testimonial.findById(req.params.id)
    if (!testimonial || testimonial.division !== req.staffAuth.division) {
      res.status(404).json({ success: false, message: 'Testimonial not found' })
      return
    }

    if (body.quote) testimonial.quote = String(body.quote).trim().slice(0, 500)
    if (body.rating !== undefined) testimonial.rating = Math.min(5, Math.max(1, Number(body.rating)))
    if (Array.isArray(body.tags)) testimonial.tags = body.tags.map(String)
    if (typeof body.approved === 'boolean') testimonial.approved = body.approved

    await testimonial.save()
    res.json({ success: true, testimonial })
  } catch (error) {
    logger.error('updateTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to update testimonial' })
  }
})

testimonialRouter.delete('/testimonials/:id', requireAdmin, requireDivision('digital', 'print'), async (req, res) => {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Testimonial } = getDivisionModels(req.staffAuth.division)
    await Testimonial.deleteOne({ _id: req.params.id, division: req.staffAuth.division })
    res.json({ success: true })
  } catch (error) {
    logger.error('deleteTestimonial failed', error)
    res.status(500).json({ success: false, message: 'Failed to delete testimonial' })
  }
})
