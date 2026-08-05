import { Connection } from 'mongoose'
import { createStaffModel } from '../features/admin/models/staff.model'
import { createRefreshTokenModel } from '../features/admin/models/refresh-token.model'
import { createLeadModel } from './lead.model'
import { createOrderModel } from '../features/orders/models/order.model'
import { createUserModel } from './user.model'
import { createOtpModel } from './otp.model'
import { createOnboardingDraftModel } from './onboarding-draft.model'

export interface DivisionModels {
  Staff: ReturnType<typeof createStaffModel>
  RefreshToken: ReturnType<typeof createRefreshTokenModel>
  Lead: ReturnType<typeof createLeadModel>
  Order: ReturnType<typeof createOrderModel>
  User: ReturnType<typeof createUserModel>
  Otp: ReturnType<typeof createOtpModel>
  OnboardingDraft: ReturnType<typeof createOnboardingDraftModel>
}

const _registry: Partial<Record<'digital' | 'print', DivisionModels>> = {}

export function registerDivisionModels(
  division: 'digital' | 'print',
  conn: Connection
): DivisionModels {
  const models: DivisionModels = {
    Staff: createStaffModel(conn),
    RefreshToken: createRefreshTokenModel(conn),
    Lead: createLeadModel(conn),
    Order: createOrderModel(conn),
    User: createUserModel(conn),
    Otp: createOtpModel(conn),
    OnboardingDraft: createOnboardingDraftModel(conn),
  }
  _registry[division] = models
  return models
}

export function getDivisionModels(division: 'digital' | 'print'): DivisionModels {
  const models = _registry[division]
  if (!models) {
    throw new Error(`Models for division "${division}" are not registered`)
  }
  return models
}