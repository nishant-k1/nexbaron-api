import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { randomUUID } from 'crypto'

import { getDivisionModels } from '../../models/registry'
import { QuoteStatus } from '../../models/quote.model'
import { logger } from '../../utils/logger'
import { escapeRegex } from '../../utils/regex'
import { requireAuthenticated } from '../../middleware/require-authenticated'
import { computePrintEstimate } from '../../features/print/catalog'
import { PRINT_FINISHES, PRINT_PRODUCTS, PRINT_STOCK_TIERS } from '../../features/print/catalog'
import { digitalCatalog } from '../../features/digital/catalog/catalog'
import { nextQuoteNumber, sendQuoteEmail, whatsAppDelivery, quoteHtml } from '../services/quote-service'
import { runtimeBrand } from '../../utils/runtime-brand'
import { stringParam } from '../../utils/route-param'

const VALID_STATUSES: QuoteStatus[] = ['new', 'quoted', 'accepted', 'lost', 'closed']
const MAX_PRINT_QUANTITY = Number(process.env.MAX_PRINT_QUANTITY) || 1_000_000

function isObjectId(value: string | undefined): value is string {
  return Boolean(value && /^[a-f\d]{24}$/i.test(value))
}

// Customer-facing: store a quote request. Authenticated, brand-scoped via the
// token's division. Email always comes from the signed-in account (compulsory).
export async function submitQuote(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const body = (req.body ?? {}) as Record<string, any>

    const { User, Lead, Quote, InvoiceCounter } = getDivisionModels(division)

    // Optional account link — guests may request a quote without signing in.
    const user = (req.userId && isObjectId(req.userId))
      ? await User.findById(req.userId).then((found) => (found && found.division === division ? found : null))
      : null

    const clientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId.trim() : ''
    if (clientRequestId && !/^[A-Za-z0-9_-]{16,100}$/.test(clientRequestId)) {
      res.status(400).json({ success: false, message: 'Invalid quote request identifier' })
      return
    }
    if (clientRequestId) {
      const existing = user
        ? await Quote.findOne({ userId: user._id, clientRequestId })
        : await Quote.findOne({ 'customer.email': String(body.email || '').trim().toLowerCase(), clientRequestId })
      if (existing) {
        res.json({
          success: true,
          quoteId: existing._id,
          quoteNumber: existing.quoteNumber,
          leadId: existing.leadId,
          selection: existing.selection,
        })
        return
      }
    }

    const email = String(user?.email || body.email || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: 'A valid email is required to request a quote' })
      return
    }

    const name = String(body.name || user?.name || '').trim()
    if (!name || name.length < 2) {
      res.status(400).json({ success: false, message: 'Please provide a valid name' })
      return
    }

    // Brand-specific selection + server-side estimate (no client trust).
    const selection: Record<string, unknown> = {}
    const details: Record<string, unknown> = {}
    let serverEstimate: ReturnType<typeof computePrintEstimate> | null = null
    if (division === 'print') {
      // Accept items array: [{ product, quantity }]
      const items: { product: string; quantity: number }[] = Array.isArray(body.items)
        ? body.items.map((it: any) => ({
            product: String(it.product || '').trim(),
            quantity: Number(it.quantity) || 0,
          })        ).filter((it: any) => it.product && it.quantity >= 1 && it.quantity <= MAX_PRINT_QUANTITY)
        : []

      // Fallback to single product+quantity for backward compat
      if (items.length === 0) {
        const product = String(body.product || '').trim()
        const quantity = Number(body.quantity)
        if (product && quantity >= 1 && quantity <= MAX_PRINT_QUANTITY) {
          items.push({ product, quantity })
        }
      }

      if (items.length === 0) {
        res.status(400).json({ success: false, message: 'Please choose at least one product with a valid quantity (min 500)' })
        return
      }

      for (const item of items) {
        if (!PRINT_PRODUCTS.some((p) => p.id === item.product)) {
          res.status(400).json({ success: false, message: `Invalid product: ${item.product}` })
          return
        }
      }

      const estimate = computePrintEstimate({
        product: items[0].product,
        quantity: items[0].quantity,
        stock: 'standard',
        finishing: 'none',
      })
      serverEstimate = estimate
      selection.items = items
      selection.estimatedPrice = estimate.estimatedPrice
      details.company = String(body.company || '').trim() || undefined
      details.deadline = String(body.deadline || '').trim() || undefined
      details.deliveryPincode = String(body.deliveryPincode || '').trim() || undefined
      details.address = String(body.address || '').trim() || undefined
      details.city = String(body.city || '').trim() || undefined
      details.state = String(body.state || '').trim() || undefined
      details.notes = String(body.notes || '').trim() || undefined
    } else {
      const planIds = Array.isArray(body.planIds) ? [...new Set(body.planIds.map(String).filter(Boolean))] : []
      if (planIds.length === 0) {
        res.status(400).json({ success: false, message: 'Please choose at least one service' })
        return
      }
      const validPlanIds = new Set(digitalCatalog.plans.map((plan) => plan.id))
      if (planIds.some((id) => !validPlanIds.has(id))) {
        res.status(400).json({ success: false, message: 'Please choose valid digital services' })
        return
      }
      const addOnIds = Array.isArray(body.addOnIds)
        ? [...new Set(body.addOnIds.map(String).filter(Boolean))]
        : []
      const validAddOnIds = new Set(digitalCatalog.plans.flatMap((plan) => plan.addOns.map((addOn) => addOn.id)))
      if (addOnIds.some((id) => !validAddOnIds.has(id))) {
        res.status(400).json({ success: false, message: 'Please choose valid digital add-ons' })
        return
      }
      selection.planIds = planIds
      selection.addOnIds = addOnIds
      details.businessType = String(body.businessType || '').trim() || undefined
      details.goal = String(body.goal || '').trim() || undefined
      details.notes = String(body.notes || '').trim() || undefined
    }

    const phone = String(body.phone || user?.phone || '').trim()

    const quoteNumber = await nextQuoteNumber(division, InvoiceCounter)

    // Mirror the checkout pipeline: surface the request in the CRM as a lead.
    const projectId = randomUUID()
    const lead = await Lead.findOneAndUpdate(
      { division, email, phone: phone || '' },
      {
        $set: {
          division,
          source: 'quote-request',
          name,
          email,
          phone,
          company: division === 'print' ? (details.company as string | undefined) : undefined,
          subject: division === 'digital' ? (selection.planIds as string[]).join(', ') : selection.product,
          message: String(details.notes || body.message || '').trim(),
          requirement: division === 'print' ? selection.product : undefined,
          quantity: division === 'print' ? String(selection.quantity) : undefined,
        },
        $setOnInsert: { status: 'new', projectId },
      },
      { upsert: true, setDefaultsOnInsert: true, new: true }
    )

    // Pre-existing lead — backfill projectId
    if (!lead.projectId) {
      lead.projectId = projectId
      await lead.save()
    }

    const quote = await Quote.create({
      division,
      projectId: lead.projectId || projectId,
      userId: req.userId ? new Types.ObjectId(req.userId) : undefined,
      leadId: lead._id,
      clientRequestId: clientRequestId || undefined,
      quoteNumber,
      customer: {
        name,
        email,
        phone,
        company: division === 'print' ? (details.company as string | undefined) : undefined,
      },
      source: 'web',
      selection,
      details,
      status: 'new',
      assignedStaff: undefined,
    })

    res.status(201).json({
      success: true,
      quoteId: quote._id,
      quoteNumber,
      leadId: lead._id,
      selection,
      estimate: serverEstimate,
    })
  } catch (error) {
    logger.error('submitQuote failed', error)
    res.status(500).json({ success: false, message: 'Could not save your quote request' })
  }
}

// Customer dashboard: the signed-in user's quote requests.
export async function myQuotes(req: Request, res: Response) {
  try {
    if (!requireAuthenticated(req, res)) return
    const division = runtimeBrand
    if (!isObjectId(req.userId)) {
      res.status(401).json({ success: false, message: 'Invalid authentication subject' })
      return
    }
    const { Quote, User } = getDivisionModels(division)
    const user = await User.findOne({ _id: req.userId, division })
    if (!user) {
      res.status(401).json({ success: false, message: 'Account unavailable' })
      return
    }
    const quotes = await Quote.find({
      userId: req.userId ? new Types.ObjectId(req.userId) : undefined,
      division,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    res.json({
      success: true,
      quotes: quotes.map((q) => ({
        quoteId: q._id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        selection: q.selection,
        response: q.response?.sentAt ? q.response : null,
        createdAt: q.createdAt,
      })),
    })
  } catch (error) {
    logger.error('myQuotes failed', error)
    res.status(500).json({ success: false, message: 'Could not load your quotes' })
  }
}

// Admin-only: list quotes for the staff member's division.
export async function listQuotes(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const status = req.query.status
    const assigned = req.query.assigned
    const search = (req.query.search as string) || ''

    const { Quote } = getDivisionModels(req.staffAuth.division)
    const filter: Record<string, unknown> = { division: req.staffAuth.division }
    if (VALID_STATUSES.includes(status as QuoteStatus)) filter.status = status
    if (assigned === 'mine') filter.assignedStaff = req.staffAuth.name
    if (assigned === 'unassigned') filter.assignedStaff = null
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { quoteNumber: rx },
        { 'customer.name': rx },
        { 'customer.email': rx },
        { 'customer.phone': rx },
      ]
    }

    const quotes = await Quote.find(filter).sort({ createdAt: -1 }).limit(500).lean()
    res.json({ success: true, quotes })
  } catch (error) {
    logger.error('listQuotes failed', error)
    res.status(500).json({ success: false, message: 'Failed to load quotes' })
  }
}

// Admin-only: single quote detail.
export async function getQuote(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = stringParam(req, 'id')
    if (!isObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid quote id' })
      return
    }
    const { Quote } = getDivisionModels(req.staffAuth.division)
    const quote = await Quote.findOne({ _id: id, division: req.staffAuth.division }).lean()
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quote not found' })
      return
    }
    res.json({ success: true, quote })
  } catch (error) {
    logger.error('getQuote failed', error)
    res.status(500).json({ success: false, message: 'Failed to load quote' })
  }
}

// Admin-only: update status / notes / assignment / response draft.
export async function updateQuote(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = stringParam(req, 'id')
    if (!isObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid quote id' })
      return
    }
    const body = (req.body ?? {}) as Record<string, any>
    const { Quote } = getDivisionModels(req.staffAuth.division)
    const quote = await Quote.findOne({ _id: id, division: req.staffAuth.division })
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quote not found' })
      return
    }

    if (typeof body.status === 'string' && VALID_STATUSES.includes(body.status as QuoteStatus)) {
      const nextStatus = body.status as QuoteStatus
      if (quote.status !== nextStatus) {
        quote.status = nextStatus
        quote.statusHistory.push({ status: nextStatus, at: new Date() })
      }
    }
    if (typeof body.assignedStaff === 'string') {
      quote.assignedStaff = body.assignedStaff.trim() || undefined
    }
    if (typeof body.response === 'object' && body.response !== null) {
      if (req.staffAuth.role === 'staff') {
        res.status(403).json({ success: false, message: 'Only owners and admins can update quote pricing' })
        return
      }
      const response = body.response as Record<string, unknown>
      quote.response = {
        ...(quote.response ?? {}),
        channels: quote.response?.channels ?? [],
        ...(typeof response.price === 'number' ? { price: response.price } : {}),
        ...(typeof response.monthlyPrice === 'number' ? { monthlyPrice: response.monthlyPrice } : {}),
        ...(typeof response.validityDays === 'number' ? { validityDays: response.validityDays } : {}),
        ...(typeof response.message === 'string' ? { message: response.message } : {}),
        ...(Array.isArray(response.channels) ? { channels: response.channels.map(String) } : {}),
      }
    }
    if (typeof body.note === 'string' && body.note.trim()) {
      quote.notes.push({ text: body.note.trim(), staff: req.staffAuth.name, at: new Date() })
    }

    await quote.save()
    res.json({ success: true, quote })
  } catch (error) {
    logger.error('updateQuote failed', error)
    res.status(500).json({ success: false, message: 'Failed to update quote' })
  }
}

// Admin-only: preview the quote email HTML before sending.
export async function previewQuote(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = stringParam(req, 'id')
    if (!isObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid quote id' })
      return
    }
    const { Quote } = getDivisionModels(req.staffAuth.division)
    const quote = await Quote.findOne({ _id: id, division: req.staffAuth.division })
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quote not found' })
      return
    }
    const html = quoteHtml(quote)
    res.json({ success: true, html })
  } catch (error) {
    logger.error('previewQuote failed', error)
    res.status(500).json({ success: false, message: 'Failed to generate preview' })
  }
}

// Admin-only: compose + deliver the final quote (email compulsory, WhatsApp
// when configured). Requires a price so a quote is never sent empty.
export async function sendQuote(req: Request, res: Response) {
  try {
    if (!req.staffAuth) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }
    const id = stringParam(req, 'id')
    if (!isObjectId(id)) {
      res.status(400).json({ success: false, message: 'Invalid quote id' })
      return
    }
    const body = (req.body ?? {}) as Record<string, any>
    const { Quote } = getDivisionModels(req.staffAuth.division)
    const quote = await Quote.findOne({ _id: id, division: req.staffAuth.division })
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quote not found' })
      return
    }
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0) {
      res.status(400).json({ success: false, message: 'Please set a quote price' })
      return
    }
    if (body.monthlyPrice !== undefined && (
      typeof body.monthlyPrice !== 'number' ||
      !Number.isFinite(body.monthlyPrice) ||
      body.monthlyPrice < 0
    )) {
      res.status(400).json({ success: false, message: 'Monthly price must be a non-negative number' })
      return
    }
    if (body.validityDays !== undefined && (
      typeof body.validityDays !== 'number' ||
      !Number.isInteger(body.validityDays) ||
      body.validityDays < 1
    )) {
      res.status(400).json({ success: false, message: 'Validity must be a positive whole number of days' })
      return
    }

    const previousResponse = quote.response
    quote.response = {
      price: body.price,
      monthlyPrice: typeof body.monthlyPrice === 'number' ? body.monthlyPrice : undefined,
      validityDays: typeof body.validityDays === 'number' ? body.validityDays : 7,
      message: String(body.message || '').trim() || undefined,
      channels: ['email'],
      sentBy: req.staffAuth.name,
      sentAt: new Date(),
    }
    const emailed = await sendQuoteEmail(quote)
    if (!emailed) {
      quote.response = previousResponse
      res.status(502).json({
        success: false,
        message: 'The quote email could not be sent; no sent or quoted state was saved',
      })
      return
    }

    const wa = whatsAppDelivery(quote)
    if (quote.status !== 'quoted') {
      quote.status = 'quoted'
      quote.statusHistory.push({ status: 'quoted', at: new Date() })
    }
    await quote.save()

    res.json({
      success: true,
      quote,
      whatsApp: wa.available ? { link: wa.link } : undefined,
    })
  } catch (error) {
    logger.error('sendQuote failed', error)
    res.status(500).json({ success: false, message: 'Failed to send quote' })
  }
}
