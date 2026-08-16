import { Router } from 'express'
import { getCatalog } from '../controllers/catalog-controller'

export const catalogRouter = Router()

catalogRouter.get('/', getCatalog)
