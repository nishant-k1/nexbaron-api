import { IInvoice } from '../../../models/invoice.model'
import servicePricingPlans from '../../digital/catalog/plans/v1/plans-type'

export interface BillingSummary {
  oneTimeTotal: number
  oneTimePaid: number
  oneTimeDue: number
  recurringTotal: number
  recurringPaid: number
  recurringDue: number
  totalPaid: number
  amountDue: number
  paidPercent: number
}

export interface BillingInstallment {
  number: number
  dueDate: Date
  amount: number
  status: 'paid' | 'due' | 'overdue'
  paidAt?: string
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
  const recurringPaid = Math.max(0, totalPaid - oneTimeTotal)
  const recurringDue = Math.max(0, recurringTotal - recurringPaid)
  const amountDue = Math.max(0, (invoice.amount || 0) - totalPaid)
  const paidPercent = invoice.amount > 0 ? Math.min(100, Math.round((totalPaid / invoice.amount) * 100)) : 0
  return { oneTimeTotal, oneTimePaid, oneTimeDue, recurringTotal, recurringPaid, recurringDue, totalPaid, amountDue, paidPercent, oneTimeItems, recurringItems, successfulPayments } as BillingSummary & { oneTimeItems: any; recurringItems: any; successfulPayments: any }
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
    if (isPaid) {
      const relevantPayment = successfulPayments.filter((p: any) => new Date(p.at) <= dueDate).sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
      if (relevantPayment) paidAt = new Date(relevantPayment.at).toISOString()
    }
    installments.push({ number: i + 1, dueDate, amount: installmentAmount, status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'due', paidAt })
  }
  return installments
}
