import { Request, Response } from 'express'
import { Contact } from '../../../models/contact.model'
import { logger } from '../../../utils/logger'

export async function createContact(req: Request, res: Response) {
  try {
    const { name, email, phone, company, subject, message } = req.body

    const contact = new Contact({
      name,
      email,
      phone,
      company,
      subject,
      message,
    })

    await contact.save()

    logger.info('Contact created:', { id: contact._id, email: contact.email })

    res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      id: contact._id,
    })
  } catch (error) {
    logger.error('Error creating contact:', error)
    throw error
  }
}

