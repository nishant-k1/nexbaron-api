import { Router } from 'express'
import { getPrintCatalog, getPrintStatus } from '../controllers/print-controller'

export const printRouter = Router()

printRouter.get('/catalog', getPrintCatalog)
printRouter.get('/status', getPrintStatus)
