import { Router } from 'express'
import { getPrintBusinessProfile } from '../controllers/print-controller'

export const printBusinessProfileRouter = Router()

printBusinessProfileRouter.get('/business', getPrintBusinessProfile)
