import { Request, Response } from 'express'
import { getDivisionModels } from '../../../models/registry'
import { nextCode } from '../../../utils/sequence'
import { handleError } from '../../../utils/error'

export async function listServices(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Service } = getDivisionModels(division)
    const activeOnly = req.query.active === 'true'
    const filter: Record<string, unknown> = { division }
    if (activeOnly) filter.active = true
    const services = await Service.find(filter).sort({ createdAt: -1 }).lean()
    res.json({ success: true, services })
  } catch (error) {
    return handleError('listServices', req, res, error, 'Failed to load services')
  }
}

export async function createService(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const requestedDivision = req.body.division || division
    const { Service, Sequence } = getDivisionModels(division)
    const { name, description, category } = req.body
    if (!name?.trim()) {
      res.status(400).json({ success: false, message: 'Name is required' })
      return
    }
    const serviceCode = await nextCode(Sequence, `service-${requestedDivision}`, 'SVC')
    const service = await Service.create({
      serviceCode,
      division: requestedDivision,
      name: name.trim(),
      description,
      category,
      active: true,
    })
    res.status(201).json({ success: true, service: service.toObject() })
  } catch (error) {
    return handleError('createService', req, res, error, 'Failed to create service')
  }
}

export async function getService(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Service } = getDivisionModels(division)
    const serviceCode = String(req.params.code)
    const service = await Service.findOne({ serviceCode, division }).lean()
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' })
      return
    }
    res.json({ success: true, service })
  } catch (error) {
    return handleError('getService', req, res, error, 'Failed to load service')
  }
}

export async function updateService(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Service } = getDivisionModels(division)
    const serviceCode = String(req.params.code)
    const { name, description, category, active } = req.body
    const update: Record<string, unknown> = {}
    if (name !== undefined) update.name = name
    if (description !== undefined) update.description = description
    if (category !== undefined) update.category = category
    if (active !== undefined) update.active = active
    const service = await Service.findOneAndUpdate(
      { serviceCode, division },
      { $set: update },
      { new: true }
    )
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' })
      return
    }
    res.json({ success: true, service: service.toObject() })
  } catch (error) {
    return handleError('updateService', req, res, error, 'Failed to update service')
  }
}
