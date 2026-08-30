import { IInvoice } from '../../../models/invoice.model'
import servicePricingPlans from '../../digital/catalog/plans/v1/plans-type'

export interface BillingSummary {
  oneTimeTotal: number
  oneTimePaid: number
  oneTimeDue: number
  oneTimePaidPercent: number
  recurringTotal: number
  recurringPaid: number
  recurringDue: number
  totalPaid: number
  amountDue: number
  paidPercent: number
}

export type BillingTone = 'success' | 'warning' | 'muted' | 'danger'

export type BillingPhase = 'draft' | 'cancelled' | 'failed' | 'unpaid' | 'setup_partial' | 'setup_paid' | 'paid'

export interface BillingStatusChip {
  label: string
  tone: BillingTone
}

export interface BillingView extends BillingSummary {
  displayStatus: BillingStatusChip & { phase: BillingPhase }
  oneTimeStatus: BillingStatusChip & { dueAmount: number }
  recurringStatus: BillingStatusChip & { dueAmount: number }
  recurringNote: string
  oneTimeItems: Array<{ label: string; amount: number; type: string }>
  recurringItems: Array<{ label: string; amount: number; type: string }>
}

function computeDisplayStatus(invoice: IInvoice | any, summary: BillingSummary): BillingView['displayStatus'] {
  if (invoice.status === 'FAILED') return { label: 'Failed', tone: 'danger', phase: 'failed' }
  if (invoice.status === 'CANCELLED') return { label: 'Cancelled', tone: 'muted', phase: 'cancelled' }
  if (invoice.status === 'DRAFT') return { label: 'Draft', tone: 'muted', phase: 'draft' }
  if (summary.amountDue <= 0) return { label: 'Paid', tone: 'success', phase: 'paid' }
  if (summary.oneTimeDue <= 0 && summary.recurringDue > 0) {
    return { label: 'Recurring due', tone: 'warning', phase: 'setup_paid' }
  }
  if (summary.totalPaid > 0) return { label: 'Partially paid', tone: 'warning', phase: 'setup_partial' }
  return { label: 'Payment due', tone: 'warning', phase: 'unpaid' }
}

function computeOneTimeStatus(summary: BillingSummary): BillingView['oneTimeStatus'] {
  if (summary.oneTimeTotal <= 0) return { label: 'N/A', tone: 'muted', dueAmount: 0 }
  if (summary.oneTimeDue <= 0) return { label: 'Fully paid', tone: 'success', dueAmount: 0 }
  return { label: 'Due', tone: 'warning', dueAmount: summary.oneTimeDue }
}

function computeRecurringStatus(summary: BillingSummary): BillingView['recurringStatus'] {
  if (summary.recurringTotal <= 0) return { label: 'N/A', tone: 'muted', dueAmount: 0 }
  if (summary.oneTimeDue > 0) return { label: 'After setup', tone: 'muted', dueAmount: 0 }
  if (summary.recurringDue <= 0) return { label: 'Up to date', tone: 'success', dueAmount: 0 }
  return { label: 'Due', tone: 'warning', dueAmount: summary.recurringDue }
}

function computeRecurringNote(summary: BillingSummary): string {
  if (summary.recurringTotal <= 0) return ''
  if (summary.oneTimeDue > 0) return 'Charges start after setup is complete'
  if (summary.recurringDue > 0) return 'Setup is complete — monthly billing will begin on schedule'
  return 'Recurring billing is up to date'
}

/** Full billing view — single source of truth for Hub/CRM invoice display. */
export function buildBillingView(invoice: IInvoice | any): BillingView {
  const raw = computeBillingSummary(invoice)
  const { oneTimeItems, recurringItems, successfulPayments, ...summary } = raw as BillingSummary & {
    oneTimeItems: BillingView['oneTimeItems']
    recurringItems: BillingView['recurringItems']
    successfulPayments: unknown
  }
  return {
    ...summary,
    oneTimeItems,
    recurringItems,
    displayStatus: computeDisplayStatus(invoice, summary),
    oneTimeStatus: computeOneTimeStatus(summary),
    recurringStatus: computeRecurringStatus(summary),
    recurringNote: computeRecurringNote(summary),
  }
}

export interface BillingInstallment {
  number: number
  dueDate: Date
  amount: number
  status: 'paid' | 'due' | 'overdue'
  paidAt?: string
  paymentId?: string
}

/** Max amount allowed for the next payment (respects FIFTY_FIFTY first-half cap). */
export function computeNextPaymentCap(invoice: IInvoice | any): number {
  const summary = computeBillingSummary(invoice)
  if (summary.amountDue <= 0) return 0
  // FIFTY_FIFTY: first payment only may be capped at 50% of one-time setup
  if (invoice.paymentSchedule === 'FIFTY_FIFTY' && summary.totalPaid === 0 && summary.oneTimeTotal > 0) {
    return Math.min(Math.ceil(summary.oneTimeTotal / 2), summary.amountDue)
  }
  // FULL_UPFRONT (or any follow-on payment): allow up to full remaining invoice balance
  return summary.amountDue
}

export function computeBillingSummary(invoice: IInvoice | any): BillingSummary {
  const oneTimeItems = (invoice.lineItems || []).filter((li: any) => li.type === 'ONE_TIME')
  const recurringItems = (invoice.lineItems || []).filter((li: any) => li.type === 'RECURRING')
  const oneTimeTotal = oneTimeItems.reduce((sum: number, li: any) => sum + li.amount, 0)
  const recurringTotal = recurringItems.reduce((sum: number, li: any) => sum + li.amount, 0)
  const successfulPayments = (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS')
  const totalPaid = successfulPayments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const oneTimePaid = Math.min(totalPaid, oneTimeTotal)
  const oneTimeDue = Math.max(0, oneTimeTotal - oneTimePaid)
  const oneTimePaidPercent = oneTimeTotal > 0 ? Math.min(100, Math.round((oneTimePaid / oneTimeTotal) * 100)) : 0
  const recurringPaid = Math.max(0, totalPaid - oneTimeTotal)
  const recurringDue = Math.max(0, recurringTotal - recurringPaid)
  const amountDue = Math.max(0, (invoice.amount || 0) - totalPaid)
  const paidPercent = invoice.amount > 0 ? Math.min(100, Math.round((totalPaid / invoice.amount) * 100)) : 0
  return { oneTimeTotal, oneTimePaid, oneTimeDue, oneTimePaidPercent, recurringTotal, recurringPaid, recurringDue, totalPaid, amountDue, paidPercent, oneTimeItems, recurringItems, successfulPayments } as BillingSummary & { oneTimeItems: any; recurringItems: any; successfulPayments: any }
}

function getPlanMonths(packageId?: string): number {
  if (!packageId) return 12
  const plan = (servicePricingPlans as Record<string, any>)[packageId]
  if (plan?.pricing?.minimumMonths) return plan.pricing.minimumMonths
  return 12
}

export function computeInstallments(invoice: IInvoice | any, planMonths?: number): BillingInstallment[] {
  const recurringItems = (invoice.lineItems || []).filter((li: any) => li.type === 'RECURRING')
  if (recurringItems.length === 0) return []
  const recurringTotal = recurringItems.reduce((sum: number, li: any) => sum + li.amount, 0)
  const successfulPayments = (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS')
  const totalPaid = successfulPayments.reduce((sum: number, p: any) => sum + p.amount, 0)
  const oneTimeTotal = (invoice.lineItems || []).filter((li: any) => li.type === 'ONE_TIME').reduce((sum: number, li: any) => sum + li.amount, 0)
  const recurringPaid = Math.max(0, totalPaid - oneTimeTotal)
  const isAnnual = recurringItems.some((li: any) => String(li.label || '').toLowerCase().includes('annual') || String(li.label || '').toLowerCase().includes('year'))
  const cycleDays = isAnnual ? 365 : 28
  const installmentAmount = recurringTotal
  const months = planMonths ?? getPlanMonths(invoice.packageId)
  const numInstallments = isAnnual ? 1 : months
  const installments: BillingInstallment[] = []
  const invoiceDate = new Date(invoice.createdAt)
  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + (i + 1) * cycleDays)
    const installmentPaidAmount = Math.min(recurringPaid, installmentAmount * (i + 1)) - Math.min(recurringPaid, installmentAmount * i)
    const isPaid = installmentPaidAmount >= installmentAmount * 0.9
    const isOverdue = !isPaid && dueDate < new Date()
    let paidAt: string | undefined
    let paymentId: string | undefined
    if (isPaid) {
      const relevantPayment = successfulPayments.filter((p: any) => new Date(p.at) <= dueDate).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
      if (relevantPayment) {
        paidAt = new Date(relevantPayment.at).toISOString()
        paymentId = relevantPayment.paymentId || relevantPayment.razorpayPaymentId
      }
    }
    installments.push({ number: i + 1, dueDate, amount: installmentAmount, status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'due', paidAt, paymentId })
  }
  return installments
}
