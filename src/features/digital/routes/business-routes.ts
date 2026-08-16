import { Router } from 'express'
import { getBusinesses, getBusinessBySlugHandler } from '../controllers/catalog-controller'

export const businessRouter = Router()

businessRouter.get('/businesses', getBusinesses)
businessRouter.get('/businesses/:slug', getBusinessBySlugHandler)
