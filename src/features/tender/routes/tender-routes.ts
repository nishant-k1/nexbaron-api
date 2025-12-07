import { Router } from 'express'
import { uploadTender } from '../controllers/tender-controller'
import { upload } from '../middleware/file-upload'
import { validateTenderUpload } from '../middleware/tender-validation'

export const tenderRouter = Router()

tenderRouter.post(
  '/upload',
  upload.single('file'),
  validateTenderUpload,
  uploadTender
)

