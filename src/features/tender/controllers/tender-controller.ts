import { Request, Response } from 'express'
import { FileRecord } from '../../../models/file-record.model'
import { logger } from '../../../utils/logger'

export async function uploadTender(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      })
    }

    const fileRecord = new FileRecord({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.body.uploadedBy || undefined,
    })

    await fileRecord.save()

    logger.info('Tender file uploaded:', {
      id: fileRecord._id,
      filename: fileRecord.filename,
      size: fileRecord.size,
    })

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: fileRecord._id,
        filename: fileRecord.originalName,
        size: fileRecord.size,
        mimeType: fileRecord.mimeType,
      },
    })
  } catch (error) {
    logger.error('Error uploading tender file:', error)
    throw error
  }
}

