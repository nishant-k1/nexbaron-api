import { Router } from 'express'
import { getBusinessProfile } from '../controllers/catalog-controller'

export const businessProfileRouter = Router()

businessProfileRouter.get('/business', getBusinessProfile)
