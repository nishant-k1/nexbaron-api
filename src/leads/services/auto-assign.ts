import { getDivisionModels } from '../../models/registry'
import { logger } from '../../utils/logger'

/**
 * Round-robin assignment: picks the active staff member with the
 * oldest (or no) lead assignment in this division.
 * Returns null when no active staff are available.
 */
export async function getNextStaffForAssignment(division: string): Promise<string | null> {
  try {
    const { Staff, Lead } = getDivisionModels(division as 'digital' | 'print')
    const staffMembers = await Staff.find({ division: division as 'digital' | 'print', active: true }).lean()
    if (staffMembers.length === 0) return null

    const staffNames = staffMembers.map((s) => s.name)
    const lastAssignments = await Lead.aggregate([
      { $match: { division, assignedStaff: { $in: staffNames } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$assignedStaff', lastAt: { $first: '$createdAt' } } },
    ])

    const lastMap: Record<string, Date | null> = {}
    for (const entry of lastAssignments) {
      lastMap[entry._id] = entry.lastAt
    }

    const sorted = [...staffMembers].sort((a, b) => {
      const aLast = lastMap[a.name]?.getTime() ?? 0
      const bLast = lastMap[b.name]?.getTime() ?? 0
      return aLast - bLast
    })

    return sorted[0].name
  } catch (error) {
    logger.error('getNextStaffForAssignment failed', error)
    return null
  }
}
