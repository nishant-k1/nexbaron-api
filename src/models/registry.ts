import { Connection } from 'mongoose'
import { createStaffModel } from './staff.model'
import { createRefreshTokenModel } from './refresh-token.model'
import { createLeadModel } from './lead.model'
import { createOrderModel } from './order.model'
import { createUserModel } from './user.model'
import { createOtpModel } from './otp.model'
import { createOnboardingDraftModel } from './onboarding-draft.model'
import { createInvoiceCounterModel } from './invoice-counter.model'
import { createQuoteModel } from './quote.model'
import { createChatMessageModel } from './chat-message.model'
import { createReminderModel } from './reminder.model'
import { createRecurringServiceModel } from './recurring-service.model'
import { createTestimonialModel } from './testimonial.model'
import { createSequenceModel } from './sequence.model'
import { createAccountModel } from './account.model'
import { createServiceModel } from './service.model'
import { createPackageModel } from './package.model'
import { createPackageServiceModel } from './package-service.model'
import { createProposalModel } from './proposal.model'
import { createInvoiceModel } from './invoice.model'
import { runtimeBrand } from '../config/brand'

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
  ChatMessage: ReturnType<typeof createChatMessageModel>
  Reminder: ReturnType<typeof createReminderModel>
  RecurringService: ReturnType<typeof createRecurringServiceModel>
  Testimonial: ReturnType<typeof createTestimonialModel>
  Sequence: ReturnType<typeof createSequenceModel>
  Account: ReturnType<typeof createAccountModel>
  Service: ReturnType<typeof createServiceModel>
  Package: ReturnType<typeof createPackageModel>
  PackageService: ReturnType<typeof createPackageServiceModel>
  Proposal: ReturnType<typeof createProposalModel>
  Invoice: ReturnType<typeof createInvoiceModel>
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
    ChatMessage: createChatMessageModel(conn),
    Reminder: createReminderModel(conn),
    RecurringService: createRecurringServiceModel(conn),
    Testimonial: createTestimonialModel(conn),
    Sequence: createSequenceModel(conn),
    Account: createAccountModel(conn),
    Service: createServiceModel(conn),
    Package: createPackageModel(conn),
    PackageService: createPackageServiceModel(conn),
    Proposal: createProposalModel(conn),
    Invoice: createInvoiceModel(conn),
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
