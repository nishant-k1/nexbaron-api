import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { getTestimonials, postTestimonial, patchTestimonial, deleteTestimonialById } from '../controllers/admin-resources-controller'

export const testimonialRouter = Router()

testimonialRouter.get('/testimonials', requireAdmin, requireDivision('digital', 'print'), getTestimonials)
testimonialRouter.post('/testimonials', requireAdmin, requireDivision('digital', 'print'), postTestimonial)
testimonialRouter.patch('/testimonials/:id', requireAdmin, requireDivision('digital', 'print'), patchTestimonial)
testimonialRouter.delete('/testimonials/:id', requireAdmin, requireDivision('digital', 'print'), deleteTestimonialById)
