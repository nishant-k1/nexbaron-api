import bcrypt from 'bcryptjs'
import { IStaff } from '../models/staff.model'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  verifyToken,
} from './token'
import { getDivisionModels } from '../../../models/registry'
import type { StaffDivision } from '../models/staff.model'

const BCRYPT_ROUNDS = 12

export interface PublicStaff {
  id: string
  email: string
  name: string
  role: IStaff['role']
  division: IStaff['division']
}

export function getPublicStaff(staff: IStaff): PublicStaff {
  return {
    id: staff._id.toString(),
    email: staff.email,
    name: staff.name,
    role: staff.role,
    division: staff.division,
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<IStaff | null> {
  // Search both division databases (email is unique within a division).
  const normalized = email.toLowerCase().trim()
  for (const division of ['digital', 'print'] as StaffDivision[]) {
    const Staff = getDivisionModels(division).Staff
    const staff = await Staff.findOne({ email: normalized, active: true })
    if (staff) {
      const ok = await bcrypt.compare(password, staff.passwordHash)
      return ok ? staff : null
    }
  }
  return null
}

export function issueTokens(staff: IStaff): { access: string; refresh: string } {
  const base = {
    sub: staff._id.toString(),
    role: staff.role,
    division: staff.division,
    name: staff.name,
  }
  return {
    access: createAccessToken(base),
    refresh: createRefreshToken(base),
  }
}

export async function persistRefreshToken(
  staffId: string,
  refreshToken: string,
  division: StaffDivision
): Promise<void> {
  const { RefreshToken } = getDivisionModels(division)
  await RefreshToken.create({
    staffId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  })
}

export async function rotateRefreshToken(
  staff: IStaff,
  oldToken: string,
  oldHash: string
): Promise<{ access: string; refresh: string } | null> {
  const { RefreshToken } = getDivisionModels(staff.division)
  const stored = await RefreshToken.findOne({
    staffId: staff._id,
    tokenHash: oldHash,
    revokedAt: null,
  })
  if (!stored || stored.expiresAt.getTime() < Date.now()) return null

  const next = issueTokens(staff)
  await RefreshToken.updateOne(
    { _id: stored._id },
    {
      revokedAt: new Date(),
      rotatedFrom: oldToken,
    }
  )
  await persistRefreshToken(staff._id.toString(), next.refresh, staff.division)
  return next
}

export async function revokeRefreshToken(token: string, division: StaffDivision): Promise<void> {
  const { RefreshToken } = getDivisionModels(division)
  await RefreshToken.updateMany(
    { tokenHash: hashToken(token), revokedAt: null },
    { revokedAt: new Date() }
  )
}

export async function revokeAllForStaff(
  staffId: string,
  division: StaffDivision
): Promise<void> {
  const { RefreshToken } = getDivisionModels(division)
  await RefreshToken.updateMany(
    { staffId, revokedAt: null },
    { revokedAt: new Date() }
  )
}

export async function getStaffByRefreshToken(token: string): Promise<IStaff | null> {
  const payload = verifyToken(token)
  if (!payload) return null
  const { Staff } = getDivisionModels(payload.division)
  const staff = await Staff.findById(payload.sub)
  if (!staff || !staff.active) return null
  return staff
}