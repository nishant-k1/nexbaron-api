import { Request, Response } from 'express'
import { getDivisionModels } from '../../../models/registry'
import { nextCode } from '../../../utils/sequence'
import { handleError } from '../../../utils/error'
import { runtimeBrand } from '../../../config/brand'
import type { PackageType, RecurringFrequency, PackageStatus } from '../../../models/package.model'
import { createServiceModel } from '../../../models/service.model'
import { createPackageServiceModel } from '../../../models/package-service.model'

const DELIVERY_STATUSES: PackageStatus[] = ['ANALYSIS', 'IN_PROGRESS', 'DELIVERED']

type ResolvedService = { serviceCode: string; name: string; description?: string }

async function decorateServices(
  division: 'digital' | 'print',
  packages: Array<{ packageCode: string }>
): Promise<(code: string) => ResolvedService[]> {
  const { PackageService, Service } = getDivisionModels(division)
  const codes = packages.map((p) => p.packageCode)
  const links = await (PackageService as ReturnType<typeof createPackageServiceModel>)
    .find({ packageCode: { $in: codes }, division })
    .lean()
  const serviceCodes = Array.from(new Set(links.map((l) => l.serviceCode)))
  const services = serviceCodes.length
    ? await (Service as ReturnType<typeof createServiceModel>)
        .find({ serviceCode: { $in: serviceCodes }, division })
        .lean()
    : []
  const svcMap = new Map(services.map((s) => [s.serviceCode, s]))
  const grouped: Record<string, ResolvedService[]> = {}
  for (const l of links) {
    const svc = svcMap.get(l.serviceCode)
    const entry: ResolvedService = {
      serviceCode: l.serviceCode,
      name: l.name || (svc ? svc.name : l.serviceCode),
      description: l.description || (svc ? svc.description : ''),
    }
    if (!grouped[l.packageCode]) grouped[l.packageCode] = []
    grouped[l.packageCode].push(entry)
  }
  return (code: string) => grouped[code] || []
}

async function writePackageServices(
  division: 'digital' | 'print',
  packageCode: string,
  services: Array<{ serviceCode: string; name?: string; description?: string }>
) {
  const { PackageService } = getDivisionModels(division)
  for (const s of services) {
    await (PackageService as ReturnType<typeof createPackageServiceModel>).updateOne(
      { packageCode, serviceCode: s.serviceCode, division },
      { $set: { name: s.name ?? '', description: s.description ?? '' } },
      { upsert: true }
    )
  }
}

async function packageWithServices(
  division: 'digital' | 'print',
  packageCode: string
) {
  const { Package } = getDivisionModels(division)
  const pkg = await Package.findOne({ packageCode, division }).lean()
  if (!pkg) return null
  const getServices = await decorateServices(division, [pkg])
  return { ...pkg, services: getServices(packageCode) }
}

export async function getMyPackages(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const userId = req.userId
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const { Account, Package } = getDivisionModels(division)
    const account = await Account.findOne({ userId, division }).lean()
    if (!account) {
      res.json({ success: true, packages: [] })
      return
    }
    const packages = await Package.find({ accountId: account.accountCode, division })
      .sort({ createdAt: -1 })
      .lean()
    const getServices = await decorateServices(division, packages)
    const result = packages.map((p) => ({ ...p, services: getServices(p.packageCode) }))
    res.json({ success: true, packages: result })
  } catch (error) {
    return handleError('getMyPackages', req, res, error, 'Failed to load packages')
  }
}

export async function listPackages(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package } = getDivisionModels(division)
    const accountCode = req.query.accountCode as string | undefined
    const status = req.query.status as PackageStatus | undefined
    const filter: Record<string, unknown> = { division }
    if (accountCode) filter.accountId = accountCode
    if (status) filter.deliveryStatus = status
    const packages = await Package.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    const getServices = await decorateServices(division, packages)
    const result = packages.map((p) => ({ ...p, services: getServices(p.packageCode) }))
    res.json({ success: true, packages: result })
  } catch (error) {
    return handleError('listPackages', req, res, error, 'Failed to load packages')
  }
}

export async function createPackage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Account, Package, Service, Sequence } = getDivisionModels(division)
    const {
      accountCode,
      type,
      name,
      description,
      services,
      oneTimeEnabled,
      oneTimeFee,
      paymentSchedule,
      recurringEnabled,
      recurringFee,
      recurringFrequency,
    } = req.body
    if (!accountCode || !name?.trim()) {
      res.status(400).json({ success: false, message: 'accountCode and name are required' })
      return
    }
    const account = await Account.findOne({ accountCode, division }).lean()
    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' })
      return
    }
    const requested: Array<{ serviceCode: string; name?: string; description?: string }> =
      Array.isArray(services) ? services : []
    if (requested.length) {
      const codes = requested.map((s) => s.serviceCode)
      const count = await (Service as ReturnType<typeof createServiceModel>).countDocuments({
        serviceCode: { $in: codes },
        division,
      })
      if (count !== new Set(codes).size) {
        res.status(400).json({ success: false, message: 'One or more service codes are invalid' })
        return
      }
    }
    const packageCode = await nextCode(Sequence, `package-${division}`, 'PKG')
    await Package.create({
      packageCode,
      accountId: account.accountCode,
      division,
      type: (type as PackageType) || 'STANDARD',
      name: name.trim(),
      description,
      oneTimeEnabled: oneTimeEnabled ?? !!oneTimeFee,
      oneTimeFee,
      paymentSchedule,
      recurringEnabled: recurringEnabled ?? !!recurringFee,
      recurringFee,
      recurringFrequency: recurringFrequency as RecurringFrequency,
      deliveryStatus: 'ANALYSIS',
    })
    if (requested.length) {
      await writePackageServices(division, packageCode, requested)
    }
    if (account.lifecycleStage === 'REGISTERED' || account.lifecycleStage === 'LEAD') {
      await Account.updateOne(
        { accountCode, division },
        {
          $set: { lifecycleStage: 'PACKAGE_SELECTED' },
          $push: { stageHistory: { stage: 'PACKAGE_SELECTED', by: req.staffAuth.name, at: new Date() } },
        }
      )
    }
    const resolved = await packageWithServices(division, packageCode)
    res.status(201).json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('createPackage', req, res, error, 'Failed to create package')
  }
}

export async function getPackage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const packageCode = String(req.params.code)
    const resolved = await packageWithServices(division, packageCode)
    if (!resolved) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    res.json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('getPackage', req, res, error, 'Failed to load package')
  }
}

export async function updatePackage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package } = getDivisionModels(division)
    const packageCode = String(req.params.code)
    const existing = await Package.findOne({ packageCode, division })
    if (!existing) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    const {
      name,
      description,
      type,
      oneTimeEnabled,
      oneTimeFee,
      paymentSchedule,
      recurringEnabled,
      recurringFee,
      recurringFrequency,
    } = req.body
    if (type !== undefined && type !== 'STANDARD' && type !== 'CUSTOM') {
      res.status(400).json({ success: false, message: 'Invalid package type' })
      return
    }
    if (paymentSchedule !== undefined && paymentSchedule !== 'FULL_UPFRONT' && paymentSchedule !== 'FIFTY_FIFTY') {
      res.status(400).json({ success: false, message: 'Invalid payment schedule' })
      return
    }
    if (recurringFrequency !== undefined && recurringFrequency !== 'MONTHLY' && recurringFrequency !== 'ANNUAL') {
      res.status(400).json({ success: false, message: 'Invalid recurring frequency' })
      return
    }
    const update: Record<string, unknown> = {}
    if (name !== undefined) update.name = String(name).trim()
    if (description !== undefined) update.description = description
    if (type !== undefined) update.type = type
    if (oneTimeEnabled !== undefined) update.oneTimeEnabled = !!oneTimeEnabled
    if (oneTimeFee !== undefined) update.oneTimeFee = Number(oneTimeFee)
    if (paymentSchedule !== undefined) update.paymentSchedule = paymentSchedule
    if (recurringEnabled !== undefined) update.recurringEnabled = !!recurringEnabled
    if (recurringFee !== undefined) update.recurringFee = Number(recurringFee)
    if (recurringFrequency !== undefined) update.recurringFrequency = recurringFrequency
    await Package.findOneAndUpdate({ packageCode, division }, { $set: update })
    const resolved = await packageWithServices(division, packageCode)
    res.json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('updatePackage', req, res, error, 'Failed to update package')
  }
}

export async function updateDeliveryStatus(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package } = getDivisionModels(division)
    const packageCode = String(req.params.code)
    const status = req.body.status as PackageStatus
    if (!status || !DELIVERY_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid delivery status' })
      return
    }
    const pkg = await Package.findOneAndUpdate(
      { packageCode, division },
      { $set: { deliveryStatus: status } },
      { new: true }
    ).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    const resolved = await packageWithServices(division, packageCode)
    res.json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('updateDeliveryStatus', req, res, error, 'Failed to update package status')
  }
}

export async function assignServiceToPackage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package, Service } = getDivisionModels(division)
    const packageCode = String(req.params.code)
    const { serviceCode, name, description } = req.body
    const pkg = await Package.findOne({ packageCode, division }).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    if (!serviceCode) {
      res.status(400).json({ success: false, message: 'serviceCode is required' })
      return
    }
    const svc = await (Service as ReturnType<typeof createServiceModel>)
      .findOne({ serviceCode, division })
      .lean()
    if (!svc) {
      res.status(400).json({ success: false, message: 'Service code is invalid' })
      return
    }
    await writePackageServices(division, packageCode, [
      { serviceCode, name: name ?? svc.name, description: description ?? svc.description },
    ])
    const resolved = await packageWithServices(division, packageCode)
    res.status(201).json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('assignServiceToPackage', req, res, error, 'Failed to assign service')
  }
}

export async function removeServiceFromPackage(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package, PackageService } = getDivisionModels(division)
    const packageCode = String(req.params.code)
    const serviceCode = String(req.params.serviceCode)
    const pkg = await Package.findOne({ packageCode, division }).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    await (PackageService as ReturnType<typeof createPackageServiceModel>).deleteOne({
      packageCode,
      serviceCode,
      division,
    })
    const resolved = await packageWithServices(division, packageCode)
    res.json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('removeServiceFromPackage', req, res, error, 'Failed to remove service')
  }
}

export async function reconcilePackageServices(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const division = req.staffAuth.division
    const { Package, Service, PackageService } = getDivisionModels(division)
    const packageCode = String(req.params.code)
    const services = req.body.services as Array<{ serviceCode: string }> | undefined
    const pkg = await Package.findOne({ packageCode, division }).lean()
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' })
      return
    }
    if (!Array.isArray(services)) {
      res.status(400).json({ success: false, message: 'services array is required' })
      return
    }
    const desiredCodes = services.map((s) => s.serviceCode)
    if (desiredCodes.length !== new Set(desiredCodes).size) {
      res.status(400).json({ success: false, message: 'Duplicate service codes in request' })
      return
    }
    const count = await (Service as ReturnType<typeof createServiceModel>).countDocuments({
      serviceCode: { $in: desiredCodes },
      division,
    })
    if (count !== new Set(desiredCodes).size) {
      res.status(400).json({ success: false, message: 'One or more service codes are invalid' })
      return
    }
    const existing = await (PackageService as ReturnType<typeof createPackageServiceModel>)
      .find({ packageCode, division })
      .lean()
    const existingCodes = new Set(existing.map((e) => e.serviceCode))
    const desiredSet = new Set(desiredCodes)
    const toCreate = desiredCodes.filter((c) => !existingCodes.has(c))
    const toRemove = Array.from(existingCodes).filter((c) => !desiredSet.has(c))
    const svcDocs = await (Service as ReturnType<typeof createServiceModel>)
      .find({ serviceCode: { $in: toCreate }, division })
      .lean()
    const svcMap = new Map(svcDocs.map((s) => [s.serviceCode, s]))
    for (const code of toCreate) {
      const svc = svcMap.get(code)
      await (PackageService as ReturnType<typeof createPackageServiceModel>).updateOne(
        { packageCode, serviceCode: code, division },
        { $set: { name: svc ? svc.name : code, description: svc ? svc.description : '' } },
        { upsert: true }
      )
    }
    if (toRemove.length) {
      await (PackageService as ReturnType<typeof createPackageServiceModel>).deleteMany({
        packageCode,
        serviceCode: { $in: toRemove },
        division,
      })
    }
    const resolved = await packageWithServices(division, packageCode)
    res.json({ success: true, pkg: resolved })
  } catch (error) {
    return handleError('reconcilePackageServices', req, res, error, 'Failed to reconcile services')
  }
}
