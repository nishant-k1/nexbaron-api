import { Router } from 'express'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import { listProjects, getProject } from '../controllers/project-controller'

export const adminProjectRouter = Router()
adminProjectRouter.get('/projects', requireAdmin, requireDivision('digital', 'print'), listProjects)
adminProjectRouter.get('/projects/:projectId', requireAdmin, requireDivision('digital', 'print'), getProject)
