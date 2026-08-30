import { getDivisionModels } from '../../../models/registry'

export async function computePipelineOverview(division: 'digital' | 'print') {
  const { Lead } = getDivisionModels(division)

  const pipeline = await Lead.aggregate([
    { $match: { division } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const byStatus: Record<string, number> = {}
  for (const entry of pipeline) byStatus[entry._id] = entry.count

  const total = Object.values(byStatus).reduce((s, c) => s + c, 0)
  const active = (byStatus.new || 0) + (byStatus.contacted || 0) + (byStatus.qualified || 0) + (byStatus.proposal || 0)
  const won = byStatus.won || 0
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentLeads = await Lead.countDocuments({ division, createdAt: { $gte: thirtyDaysAgo } })

  return { byStatus, total, active, won, conversionRate, recentLeads }
}

export async function computeSourcePerformance(division: 'digital' | 'print') {
  const { Lead } = getDivisionModels(division)

  const bySource = await Lead.aggregate([
    { $match: { division } },
    { $group: { _id: '$source', total: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } } } },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ])

  return bySource.map((s) => ({
    source: s._id,
    totalLeads: s.total,
    won: s.won,
    conversionRate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
  }))
}

export async function computeTeamWorkload(division: 'digital' | 'print') {
  const { Order, Staff } = getDivisionModels(division)

  const activeOrders = await Order.aggregate([
    { $match: { division, status: { $in: ['paid', 'in_progress'] } } },
    { $group: { _id: '$assignedTeamMember', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  const allStaff = await Staff.find({ division, active: true }).lean()

  const workload = allStaff.map((s) => {
    const entry = activeOrders.find((o) => o._id === s.name)
    return { name: s.name, role: s.role, activeProjects: entry?.count ?? 0 }
  })

  const unassignedEntry = activeOrders.find((o) => !o._id)
  const unassigned = {
    name: 'Unassigned',
    role: 'none',
    activeProjects: unassignedEntry?.count ?? 0,
  }

  return { workload, unassigned }
}

export async function computeRevenueReport(division: 'digital' | 'print', daysBack: number) {
  const { Order, RecurringService } = getDivisionModels(division)

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - daysBack)

  const oneTimeRevenue = await Order.aggregate([
    {
      $match: {
        division,
        status: { $in: ['paid', 'in_progress', 'delivered'] },
        createdAt: { $gte: sinceDate },
      },
    },
    { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalOrders: { $sum: 1 } } },
  ])

  const oneTimeMonthly = await Order.aggregate([
    { $match: { division, status: { $in: ['paid', 'in_progress', 'delivered'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 12 },
  ])

  const recurringRevenue = await RecurringService.aggregate([
    { $match: { division, status: 'active' } },
    { $group: { _id: null, totalMRR: { $sum: '$amount' }, totalServices: { $sum: 1 } } },
  ])

  const byType = await RecurringService.aggregate([
    { $match: { division } },
    { $group: { _id: '$type', totalMRR: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, '$amount', 0] } }, activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }, totalCount: { $sum: 1 } } },
  ])

  const oneTime = oneTimeRevenue[0] ?? { totalRevenue: 0, totalOrders: 0 }
  const recurring = recurringRevenue[0] ?? { totalMRR: 0, totalServices: 0 }

  return {
    oneTimeRevenue: oneTime.totalRevenue,
    oneTimeOrders: oneTime.totalOrders,
    monthlyMRR: recurring.totalMRR,
    activeRecurringServices: recurring.totalServices,
    totalPredictableIncome: oneTime.totalRevenue + recurring.totalMRR,
    oneTimeMonthly,
    recurringByType: byType.map((t) => ({
      type: t._id,
      mrr: t.totalMRR,
      activeCount: t.activeCount,
      totalCount: t.totalCount,
    })),
  }
}

export async function computeBottlenecks(division: 'digital' | 'print') {
  const { Order } = getDivisionModels(division)

  const orders = await Order.find({
    division,
    'stageHistory.0': { $exists: true },
    status: 'active',
  })
    .select('stageHistory status')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean()

  const stageTimes: Record<string, number[]> = {}

  for (const order of orders) {
    const history = order.stageHistory || []
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].at).getTime()
      const curr = new Date(history[i].at).getTime()
      const hours = (curr - prev) / 3600000
      if (hours > 0 && hours < 5000) {
        const stage = history[i - 1].stage
        if (!stageTimes[stage]) stageTimes[stage] = []
        stageTimes[stage].push(hours)
      }
    }
  }

  const bottlenecks = Object.entries(stageTimes).map(([stage, hours]) => {
    const avg = hours.reduce((s, h) => s + h, 0) / hours.length
    return {
      stage,
      avgHours: Math.round(avg * 10) / 10,
      avgDays: Math.round(avg / 24 * 10) / 10,
      sampleCount: hours.length,
      minHours: Math.round(Math.min(...hours) * 10) / 10,
      maxHours: Math.round(Math.max(...hours) * 10) / 10,
    }
  }).sort((a, b) => b.avgHours - a.avgHours)

  const stuckProjects = await Order.countDocuments({
    division,
    status: 'active',
  })

  return { bottlenecks, currentActiveProjects: stuckProjects, sampleSize: orders.length }
}
