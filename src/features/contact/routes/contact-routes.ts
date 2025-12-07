import { Router } from 'express'
import { createContact } from '../controllers/contact-controller'
import { validateContactRequest } from '../middleware/contact-validation'

export const contactRouter = Router()

contactRouter.post('/', validateContactRequest, createContact)

