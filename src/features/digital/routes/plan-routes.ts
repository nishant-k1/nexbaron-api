import { Router } from 'express'
import { getCatalog, getCatalogPlanById } from '../controllers/catalog-controller'

export const catalogRouter = Router()

catalogRouter.get('/', getCatalog)
catalogRouter.get('/plans/:planId', getCatalogPlanById)
