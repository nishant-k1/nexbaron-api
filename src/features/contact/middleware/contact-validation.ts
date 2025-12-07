import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../../../utils/logger'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export function validateContactRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    contactSchema.parse(req.body)
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error:', { errors: error.errors })
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
    }
    next(error)
  }
}

