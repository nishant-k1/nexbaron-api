import { Router } from 'express'
import { requireAuth } from '../../../../middleware/require-auth'
import { getDivisionModels } from '../../../../models/registry'
import { logger } from '../../../../utils/logger'
import { resolveServiceBundle } from '../service-items-pricing-catalog'

export const customPlanCustomerRouter = Router()

// Customer-facing: the custom plan assigned to the signed-in account.
customPlanCustomerRouter.get('/', requireAuth, async (req, res) => {
  try {
    const division = req.division!
    const { User, CustomPlan } = getDivisionModels(division)
    const user = await User.findById(req.userId)
    if (!user) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }
    const email = user.email?.toLowerCase()
    if (!email) {
      res.json({ success: true, plan: null })
      return
    }
    const plan = await CustomPlan.findOne({ division, customerEmail: email, status: 'shared' })
      .sort({ createdAt: -1 })
      .lean()
    if (!plan) {
      res.json({ success: true, plan: null })
      return
    }
    const bundle = resolveServiceBundle(plan.serviceIds, plan.addOnIds)
    res.json({
      success: true,
      plan: {
        id: plan._id,
        name: plan.name,
        services: bundle.services,
        addOns: bundle.addOns,
        pricing: bundle.pricing,
      },
    })
  } catch (error) {
    logger.error('myCustomPlan failed', error)
    res.status(500).json({ success: false, message: 'Could not load your custom plan' })
  }
})
