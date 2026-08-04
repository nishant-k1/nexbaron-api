import bcrypt from 'bcryptjs'
import { Staff, IStaff } from '../models/staff.model'
import { RefreshToken } from '../models/refresh-token.model'
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  verifyToken,
} from './token'

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
  const staff = await Staff.findOne({ email: email.toLowerCase().trim(), active: true })
  if (!staff) return null
  const ok = await bcrypt.compare(password, staff.passwordHash)
  if (!ok) return null
  return staff
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

export async function persistRefreshToken(staffId: string, refreshToken: string): Promise<void> {
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
  await persistRefreshToken(staff._id.toString(), next.refresh)
  return next
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await RefreshToken.updateMany(
    { tokenHash: hashToken(token), revokedAt: null },
    { revokedAt: new Date() }
  )
}

export async function revokeAllForStaff(staffId: string): Promise<void> {
  await RefreshToken.updateMany(
    { staffId, revokedAt: null },
    { revokedAt: new Date() }
  )
}

export async function getStaffByRefreshToken(token: string): Promise<IStaff | null> {
  const payload = verifyToken(token)
  if (!payload) return null
  const staff = await Staff.findById(payload.sub)
  if (!staff || !staff.active) return null
  return staff
}