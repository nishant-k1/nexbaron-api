import PDFDocument from 'pdfkit'
import { Model } from 'mongoose'

import { digitalCatalog } from '../../features/digital/catalog/catalog'
import { productLabel } from '../../features/print/catalog'
import { logger } from '../../utils/logger'
import { IQuote } from '../../models/quote.model'
import { runtimeBrand } from '../../utils/runtime-brand'

const RESEND_API_KEY = process.env[`RESEND_API_KEY_${runtimeBrand.toUpperCase()}`] || ''
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
// WhatsApp delivery is config-gated: no provider is wired up yet, so when
// enabled we only surface a wa.me link (the staff member still hits send).
const WHATSAPP_ENABLED = process.env.QUOTE_WHATSAPP_ENABLED === 'true'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface BrandConfig {
  name: string
  fromEmail: string
  accent: string
  tagline: string
}

const BRANDS: Record<'digital' | 'print', BrandConfig> = {
  digital: {
    name: 'Nexbaron Digital',
    fromEmail: process.env.QUOTE_FROM_EMAIL_DIGITAL || 'billing@nexbaron.com',
    accent: '#14b8a6',
    tagline: 'Your website & growth partner',
  },
  print: {
    name: 'Nexbaron Print',
    fromEmail: process.env.QUOTE_FROM_EMAIL_PRINT || 'billing@nexbaron.com',
    accent: '#f59e0b',
    tagline: 'Commercial printing, done right',
  },
}

export function nextQuoteNumber(division: 'digital' | 'print', InvoiceCounter: Model<any>): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = division === 'digital' ? 'NXB-D' : 'NXB-P'
  return InvoiceCounter.findOneAndUpdate(
    { key: `quote-${division}-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).then((counter) => `${prefix}-${year}-${String(counter.seq).padStart(5, '0')}`)
}

export function whatsAppDelivery(quote: IQuote): { available: boolean; link?: string } {
  if (!WHATSAPP_ENABLED) return { available: false }
  const phone = quote.customer.phone
  if (!phone) return { available: false }
  const message = quote.response?.message
    ? encodeURIComponent(quote.response.message)
    : encodeURIComponent(`Hi ${quote.customer.name}, your ${BRANDS[quote.division].name} quote is ready.`)
  return { available: true, link: `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${message}` }
}

export function selectionSummary(quote: IQuote): string {
  if (quote.division === 'digital') {
    const planIds = Array.isArray(quote.selection?.planIds) ? (quote.selection.planIds as string[]) : []
    const addOnIds = Array.isArray(quote.selection?.addOnIds) ? (quote.selection.addOnIds as string[]) : []
    const plans = planIds
      .map((id) => digitalCatalog.plans.find((p) => p.id === id)?.name ?? id)
      .join(', ')
    const addOns = addOnIds
      .map((id) => {
        const p = digitalCatalog.plans.flatMap((pl) => pl.addOns).find((a) => a.id === id)
        return p?.label ?? id
      })
      .join(', ')
    return [plans && `Plans: ${plans}`, addOns && `Add-ons: ${addOns}`].filter(Boolean).join('\n') || '—'
  }
  const product = String(quote.selection?.product ?? '')
  const quantity = String(quote.selection?.quantity ?? '')
  return [product && productLabel(product), quantity && `${quantity} units`].filter(Boolean).join('\n') || '—'
}

function brandInfo(quote: IQuote) {
  return BRANDS[quote.division]
}

export function quoteHtml(quote: IQuote): string {
  const brand = brandInfo(quote)
  const resp = quote.response
  const wa = whatsAppDelivery(quote)
  const summary = escapeHtml(selectionSummary(quote)).replace(/\n/g, '<br>')
  const validity = resp?.validityDays ?? 7

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${brand.accent};padding-bottom:16px">
      <div>
        <div style="font-size:22px;font-weight:700">${brand.name}</div>
        <div style="font-size:12px;color:#475569">${brand.tagline}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#475569">
        <div><strong>Quote:</strong> ${escapeHtml(quote.quoteNumber)}</div>
        <div>Valid for ${validity} days</div>
      </div>
    </div>
    <h2 style="font-size:18px;margin:20px 0 4px">Your Quote Request</h2>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;margin:16px 0">
      <strong>Hi ${escapeHtml(quote.customer.name)},</strong><br>
      ${escapeHtml(resp?.message || 'Here is your personalised quote. We are happy to answer any questions.')}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#f1f5f9">
        <th style="text-align:left;padding:8px">Requested</th>
        <td style="padding:8px">${summary}</td>
      </tr>
       ${quote.customer.company ? `<tr><th style="text-align:left;padding:8px">Company</th><td style="padding:8px">${escapeHtml(quote.customer.company)}</td></tr>` : ''}
      <tr>
        <th style="text-align:left;padding:8px;background:#f1f5f9">Quoted Price</th>
        <td style="padding:8px"><strong>₹${(resp?.price ?? 0).toLocaleString('en-IN')}</strong>${resp?.monthlyPrice ? ` + ₹${resp.monthlyPrice.toLocaleString('en-IN')}/mo` : ''}</td>
      </tr>
    </table>
    <p style="font-size:12px;color:#475569;margin-top:20px">
      Ready to go ahead? Just reply to this email or ping us on WhatsApp —
       ${wa.link ? `<a href="${escapeHtml(wa.link)}" style="color:${brand.accent}">send a WhatsApp message</a>` : 'we will share a link to confirm.'}
    </p>
    <p style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:24px">
       ${brand.name} · ${escapeHtml(FRONTEND_URL)}
    </p>
  </div>`
}

export function renderQuotePdf(quote: IQuote): Promise<Buffer> {
  const brand = brandInfo(quote)
  const resp = quote.response
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fillColor(brand.accent).rect(48, 48, 495, 3).fill()
    doc.fontSize(20).fillColor('#0f172a').text(brand.name, 48, 70)
    doc.fontSize(9).fillColor('#475569').text(brand.tagline)
    doc.text(`Quote: ${quote.quoteNumber}`, { align: 'right' })
    doc.moveDown(1.5)

    doc.fontSize(14).text('Your Quote Request')
    doc.moveDown(0.5)
    doc.fontSize(10).text(`Hi ${quote.customer.name},`)
    doc.text(resp?.message || 'Here is your personalised quote.')
    doc.moveDown(1)

    doc.fillColor('#f1f5f9').rect(48, doc.y, 495, 24).fill()
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
    doc.text('Requested', 52, doc.y + 8)
    doc.moveDown(1)
    doc.font('Helvetica').text(selectionSummary(quote))
    if (quote.customer.company) {
      doc.text(`Company: ${quote.customer.company}`)
    }
    doc.moveDown(1)
    doc.fillColor('#f1f5f9').rect(48, doc.y, 495, 24).fill()
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10)
    doc.text('Quoted Price', 52, doc.y + 8)
    doc.moveDown(1)
    doc.font('Helvetica').text(
      `₹${(resp?.price ?? 0).toLocaleString('en-IN')}${resp?.monthlyPrice ? ` + ₹${resp.monthlyPrice.toLocaleString('en-IN')}/mo` : ''}`
    )
    doc.moveDown(1)
    doc.fontSize(9).fillColor('#64748b').text(
      `Valid for ${resp?.validityDays ?? 7} days · ${brand.name}`
    )

    doc.end()
  })
}

export async function sendQuoteEmail(quote: IQuote): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — skipping quote email')
    return false
  }
  const to = quote.customer.email
  if (!to) {
    logger.warn('No customer email — skipping quote email')
    return false
  }
  const brand = brandInfo(quote)
  const pdf = await renderQuotePdf(quote)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: brand.fromEmail,
      to,
      subject: `Your ${brand.name} quote ${quote.quoteNumber}`,
      html: quoteHtml(quote),
      attachments: [
        {
          filename: `${quote.quoteNumber}.pdf`,
          content: pdf.toString('base64'),
        },
      ],
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    logger.error('Resend quote failed', { status: response.status, body })
    return false
  }
  return true
}
