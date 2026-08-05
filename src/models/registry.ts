import { Connection } from 'mongoose'
import { createStaffModel } from '../admin/models/staff.model'
import { createRefreshTokenModel } from '../admin/models/refresh-token.model'
import { createLeadModel } from './lead.model'
import { createOrderModel } from '../orders/models/order.model'
import { createUserModel } from './user.model'
import { createOtpModel } from './otp.model'
import { createOnboardingDraftModel } from './onboarding-draft.model'
import { createInvoiceCounterModel } from './invoice-counter.model'
import { createQuoteModel } from './quote.model'
import { runtimeBrand } from '../utils/runtime-brand'

export interface DivisionModels {
  Staff: ReturnType<typeof createStaffModel>
  RefreshToken: ReturnType<typeof createRefreshTokenModel>
  Lead: ReturnType<typeof createLeadModel>
  Order: ReturnType<typeof createOrderModel>
  User: ReturnType<typeof createUserModel>
  Otp: ReturnType<typeof createOtpModel>
  OnboardingDraft: ReturnType<typeof createOnboardingDraftModel>
  InvoiceCounter: ReturnType<typeof createInvoiceCounterModel>
  Quote: ReturnType<typeof createQuoteModel>
}

const _registry: Partial<Record<'digital' | 'print', DivisionModels>> = {}

export function registerDivisionModels(
  division: 'digital' | 'print',
  conn: Connection
): DivisionModels {
  if (division !== runtimeBrand) {
    throw new Error(`Cannot register ${division} models in the ${runtimeBrand} runtime`)
  }
  const models: DivisionModels = {
    Staff: createStaffModel(conn),
    RefreshToken: createRefreshTokenModel(conn),
    Lead: createLeadModel(conn),
    Order: createOrderModel(conn),
    User: createUserModel(conn),
    Otp: createOtpModel(conn),
    OnboardingDraft: createOnboardingDraftModel(conn),
    InvoiceCounter: createInvoiceCounterModel(conn),
    Quote: createQuoteModel(conn),
  }
  _registry[division] = models
  return models
}

export function getDivisionModels(division: 'digital' | 'print'): DivisionModels {
  if (division !== runtimeBrand) {
    throw new Error(`Cannot access ${division} models in the ${runtimeBrand} runtime`)
  }
  const models = _registry[division]
  if (!models) {
    throw new Error(`Models for division "${division}" are not registered`)
  }
  return models
}
