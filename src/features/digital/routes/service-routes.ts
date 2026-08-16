import { Router } from 'express'
import { getServices } from '../controllers/catalog-controller'

export const serviceRouter = Router()

serviceRouter.get('/services', getServices)
