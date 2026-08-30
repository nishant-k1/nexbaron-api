import { Request, Response } from 'express'

/**
 * Single source of truth for ALL status constants, labels, and business metadata.
 * Clients (Hub, CRM, Web) must consume from this endpoint instead of hardcoding.
 */

const STATUS_LABELS: Record<string, Record<string, string>> = {
  lead: {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    unqualified: 'Unqualified',
    proposal: 'Proposal',
    won: 'Won',
    lost: 'Lost',
    dormant: 'Dormant',
  },
  order: {
    active: 'Active',
    cancelled: 'Cancelled',
  },
  milestone: {
    pending: 'Pending',
    in_progress: 'In Progress',
    done: 'Done',
  },
  quote: {
    new: 'New',
    quoted: 'Quoted',
    accepted: 'Accepted',
    lost: 'Lost',
    closed: 'Closed',
  },
  proposal: {
    DRAFT: 'Draft',
    SENT: 'Sent',
    ACCEPTED: 'Accepted',
    EXPIRED: 'Expired',
  },
  invoice: {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  },
  payment: {
    INITIATED: 'Initiated',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  },
  package: {
    ANALYSIS: 'Analysis',
    IN_PROGRESS: 'In Progress',
    DELIVERED: 'Delivered',
  },
  packageVisibility: {
    DRAFT: 'Draft',
    LIVE: 'Live',
  },
  packageType: {
    STANDARD: 'Standard',
    CUSTOM: 'Custom',
  },
  paymentSchedule: {
    FULL_UPFRONT: 'Full upfront',
    FIFTY_FIFTY: '50 / 50',
  },
  lifecycle: {
    REGISTERED: 'Getting started',
    LEAD: 'Lead',
    PACKAGE_SELECTED: 'Plan selected',
    PROPOSAL_SENT: 'Proposal sent',
    PROPOSAL_ACCEPTED: 'Proposal accepted',
    PAYMENT_PENDING: 'Payment pending',
    CUSTOMER: 'Active customer',
  },
  pipeline: {
    inquiry: 'Inquiry',
    proposal: 'Proposal',
    commit: 'Commit',
    build: 'Build',
    delivery: 'Delivery',
  },
  recurringStatus: {
    active: 'Active',
    paused: 'Paused',
    cancelled: 'Cancelled',
  },
  recurringType: {
    maintenance: 'Maintenance',
    blog: 'Blog',
    social: 'Social',
    seo: 'SEO',
    other: 'Other',
  },
  recurringFrequency: {
    MONTHLY: 'Monthly',
    ANNUAL: 'Annual',
  },
  paymentMethod: {
    razorpay: 'Razorpay',
    upi: 'UPI',
    bank: 'Bank Transfer',
    cash: 'Cash',
    other: 'Other',
  },
  lineItemType: {
    ONE_TIME: 'One-time',
    RECURRING: 'Recurring',
  },
  billingTone: {
    success: 'success',
    warning: 'warning',
    muted: 'muted',
    danger: 'danger',
  },
  billingPhase: {
    draft: 'draft',
    cancelled: 'cancelled',
    failed: 'failed',
    unpaid: 'unpaid',
    setup_partial: 'setup_partial',
    setup_paid: 'setup_paid',
    paid: 'paid',
  },
  installmentStatus: {
    paid: 'Paid',
    due: 'Due',
    overdue: 'Overdue',
  },
  followUpType: {
    review: 'Review',
    upsell: 'Upsell',
    referral: 'Referral',
    checkin: 'Check-in',
  },
  reminderType: {
    payment_due: 'Payment due',
    revision_pending: 'Revision pending',
    onboarding_missing: 'Onboarding missing',
    stage_stuck: 'Stage stuck',
  },
  source: {
    website: 'Website',
    phone: 'Phone',
    email: 'Email',
    referral: 'Referral',
    whatsapp: 'WhatsApp',
    chat: 'Live Chat',
    web: 'Contact Form',
    'walk-in': 'Walk-in',
    manual: 'Manual',
    'quote-request': 'Quote Request',
    checkout: 'Checkout',
    other: 'Other',
  },
  role: {
    owner: 'Owner',
    admin: 'Admin',
    staff: 'Staff',
  },
  serviceFrequency: {
    monthly: 'Monthly',
    weekly: 'Weekly',
    quarterly: 'Quarterly',
  },
  paymentStatus: {
    unpaid: 'Unpaid',
    partially_paid: 'Partially paid',
    fully_paid: 'Fully paid',
  },
}

const VALID_STATUSES: Record<string, string[]> = {
  lead: ['new', 'contacted', 'qualified', 'unqualified', 'proposal', 'won', 'lost', 'dormant'],
  order: ['active', 'cancelled'],
  milestone: ['pending', 'in_progress', 'done'],
  quote: ['new', 'quoted', 'accepted', 'lost', 'closed'],
  proposal: ['DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED'],
  invoice: ['DRAFT', 'PENDING', 'PAID', 'FAILED', 'CANCELLED'],
  payment: ['INITIATED', 'SUCCESS', 'FAILED', 'REFUNDED'],
  package: ['ANALYSIS', 'IN_PROGRESS', 'DELIVERED'],
  packageVisibility: ['DRAFT', 'LIVE'],
  packageType: ['STANDARD', 'CUSTOM'],
  paymentSchedule: ['FULL_UPFRONT', 'FIFTY_FIFTY'],
  lifecycle: ['REGISTERED', 'LEAD', 'PACKAGE_SELECTED', 'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PAYMENT_PENDING', 'CUSTOMER'],
  pipeline: ['inquiry', 'proposal', 'commit', 'build', 'delivery'],
  recurringStatus: ['active', 'paused', 'cancelled'],
  recurringType: ['maintenance', 'blog', 'social', 'seo', 'other'],
  recurringFrequency: ['MONTHLY', 'ANNUAL'],
  paymentMethod: ['razorpay', 'upi', 'bank', 'cash', 'other'],
  lineItemType: ['ONE_TIME', 'RECURRING'],
  followUpType: ['review', 'upsell', 'referral', 'checkin'],
  reminderType: ['payment_due', 'revision_pending', 'onboarding_missing', 'stage_stuck'],
  source: ['website', 'phone', 'email', 'referral', 'whatsapp', 'chat', 'web', 'walk-in', 'manual', 'quote-request', 'checkout', 'other'],
  role: ['owner', 'admin', 'staff'],
  serviceFrequency: ['monthly', 'weekly', 'quarterly'],
  paymentStatus: ['unpaid', 'partially_paid', 'fully_paid'],
}

/** GET /metadata — full metadata for all status types */
export function getMetadata(_req: Request, res: Response) {
  res.json({
    success: true,
    statuses: VALID_STATUSES,
    labels: STATUS_LABELS,
  })
}

/** GET /metadata/:entity — metadata for a single entity type */
export function getEntityMetadata(req: Request, res: Response) {
  const entity = String(req.params.entity || '')
  const statuses = VALID_STATUSES[entity]
  const labels = STATUS_LABELS[entity]
  if (!statuses) {
    res.status(404).json({ success: false, message: `Unknown entity type: ${entity}` })
    return
  }
  res.json({
    success: true,
    entity,
    statuses,
    labels,
  })
}
