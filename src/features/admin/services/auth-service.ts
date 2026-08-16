import bcrypt from 'bcryptjs'
import { IStaff } from '../../../models/staff.model'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  verifyToken,
} from './token-service'
import { getDivisionModels } from '../../../models/registry'
import type { StaffDivision } from '../../../models/staff.model'
import { runtimeBrand } from '../../../config/brand'

const BCRYPT_ROUNDS = 12

export interface PublicStaff {
  id: string
  email: string
  name: string
  role: IStaff['role']
  division: IStaff['division']
  active: boolean
}

export function getPublicStaff(staff: IStaff): PublicStaff {
  return {
    id: staff._id.toString(),
    email: staff.email,
    name: staff.name,
    role: staff.role,
    division: staff.division,
    active: staff.active,
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<IStaff | null> {
  const normalized = email.toLowerCase().trim()
  const { Staff } = getDivisionModels(runtimeBrand)
  const staff = await Staff.findOne({ email: normalized, division: runtimeBrand, active: true })
  if (!staff) return null
  return (await bcrypt.compare(password, staff.passwordHash)) ? staff : null
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
  oldHash: string
): Promise<{ access: string; refresh: string } | null> {
  const { RefreshToken } = getDivisionModels(staff.division)
  const stored = await RefreshToken.findOneAndUpdate({
    staffId: staff._id,
    tokenHash: oldHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }, {
    $set: {
      revokedAt: new Date(),
      rotatedFromHash: oldHash,
    },
  }, { new: true })
  if (!stored) return null

  const next = issueTokens(staff)
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
  if (!payload || payload.division !== runtimeBrand) return null
  const { Staff } = getDivisionModels(runtimeBrand)
  const staff = await Staff.findOne({ _id: payload.sub, division: runtimeBrand, active: true })
  if (!staff) return null
  return staff
}
