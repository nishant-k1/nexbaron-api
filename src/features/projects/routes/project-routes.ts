import { Router } from 'express'
import { requireAuth } from '../../../middleware/require-auth'
import { getMyProjects, getMyProject } from '../controllers/project-controller'

export const customerProjectRouter = Router()
customerProjectRouter.get('/projects', requireAuth, getMyProjects)
customerProjectRouter.get('/projects/:projectId', requireAuth, getMyProject)
