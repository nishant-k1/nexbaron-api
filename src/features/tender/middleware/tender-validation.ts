import { Request, Response, NextFunction } from 'express'
import { logger } from '../../../utils/logger'

export function validateTenderUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.file) {
    logger.warn('Tender upload attempted without file')
    return res.status(400).json({
      error: 'Validation error',
      message: 'File is required',
    })
  }

  next()
}

