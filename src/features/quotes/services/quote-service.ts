import PDFDocument from 'pdfkit'
import { Model } from 'mongoose'

import { PLAN_CATALOG } from '../../digital/catalog/service-package-pricing-catalog'
import { getProductLabel } from '../../print/product-catalog'
import { logger } from '../../../utils/logger'
import { IQuote } from '../../../models/quote.model'
import { canSendMail, sendMail } from '../../../utils/mailer'
import { escapeHtml, logoNx, NX_DIGITAL, NX_PRINT } from '../../../utils/html'
import { nextSequence } from '../../../utils/counter'

const WHATSAPP_ENABLED = process.env.QUOTE_WHATSAPP_ENABLED === 'true'

interface BrandConfig {
  name: string
  fromEmail: string
  accent: string
  accentLight: string
  tagline: string
  division: 'digital' | 'print'
}

const BRANDS: Record<'digital' | 'print', BrandConfig> = {
  digital: {
    name: 'Nexbaron Digital',
    fromEmail: process.env.QUOTE_FROM_EMAIL_DIGITAL || 'billing@nexbaron.com',
    accent: '#14b8a6',
    accentLight: '#ccfbf1',
    tagline: 'Your website & growth partner',
    division: 'digital',
  },
  print: {
    name: 'Nexbaron Print',
    fromEmail: process.env.QUOTE_FROM_EMAIL_PRINT || 'billing@nexbaron.com',
    accent: '#f59e0b',
    accentLight: '#fef3c7',
    tagline: 'Commercial printing, done right',
    division: 'print',
  },
}

export function nextQuoteNumber(division: 'digital' | 'print', InvoiceCounter: Model<any>): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = division === 'digital' ? 'NXB-D' : 'NXB-P'
  return nextSequence(InvoiceCounter, `quote-${division}-${year}`)
    .then((seq) => `${prefix}-${year}-${String(seq).padStart(5, '0')}`)
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
      .map((id) => PLAN_CATALOG.plans.find((p) => p.id === id)?.name ?? id)
      .join(', ')
    const addOns = addOnIds
      .map((id) => {
        const p = PLAN_CATALOG.plans.flatMap((pl) => pl.addOns).find((a) => a.id === id)
        return p?.label ?? id
      })
      .join(', ')
    return [plans && `Plans: ${plans}`, addOns && `Add-ons: ${addOns}`].filter(Boolean).join('\n') || '—'
  }
  const product = String(quote.selection?.product ?? '')
  const quantity = String(quote.selection?.quantity ?? '')
  return [product && getProductLabel(product), quantity && `${quantity} units`].filter(Boolean).join('\n') || '—'
}

function brandInfo(quote: IQuote) {
  return BRANDS[quote.division]
}

function nxColors(division: 'digital' | 'print') {
  return division === 'digital' ? NX_DIGITAL : NX_PRINT
}

export function quoteHtml(quote: IQuote): string {
  const brand = brandInfo(quote)
  const resp = quote.response
  const wa = whatsAppDelivery(quote)
  const summary = escapeHtml(selectionSummary(quote)).replace(/\n/g, '<br>')
  const validity = resp?.validityDays ?? 7
  const price = (resp?.price ?? 0).toLocaleString('en-IN')
  const monthly = resp?.monthlyPrice ? resp.monthlyPrice.toLocaleString('en-IN') : null

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">

      <!-- Header -->
      <tr>
        <td style="padding:32px 40px 24px;background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%)">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle">
                ${logoNx(nxColors(quote.division))}
              </td>
              <td style="vertical-align:middle;padding-left:14px">
                <div style="font-size:20px;font-weight:700;color:#fff;line-height:1.2">${brand.name}</div>
                <div style="font-size:11px;color:#94a3b8">${brand.tagline}</div>
              </td>
              <td style="text-align:right;vertical-align:middle">
                <div style="font-size:11px;color:#94a3b8;line-height:1.6">
                  <div><strong style="color:#e2e8f0">Quote</strong> ${escapeHtml(quote.quoteNumber)}</div>
                  <div>Valid ${validity} days</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding:28px 40px 16px">
          <div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:8px">Your Quote is Ready</div>
          <div style="font-size:14px;color:#475569;line-height:1.7">
            Hi ${escapeHtml(quote.customer.name)},<br>
            ${escapeHtml(resp?.message || 'Thank you for your interest. Here is your personalised quote.')}
          </div>
        </td>
      </tr>

      <!-- Summary Card -->
      <tr>
        <td style="padding:8px 40px 28px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:14px 18px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;width:120px">Requested</td>
              <td style="padding:14px 18px;font-size:13px;color:#0f172a">${summary}</td>
            </tr>
            ${quote.customer.company ? `<tr><td style="padding:14px 18px;border-top:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#64748b">Company</td><td style="padding:14px 18px;border-top:1px solid #f1f5f9;font-size:13px;color:#0f172a">${escapeHtml(quote.customer.company)}</td></tr>` : ''}
            <tr>
              <td style="padding:14px 18px;border-top:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#64748b">Your Price</td>
              <td style="padding:14px 18px;border-top:1px solid #f1f5f9">
                <span style="font-size:22px;font-weight:700;color:${brand.accent}">₹${price}</span>
                ${monthly ? `<span style="font-size:13px;color:#64748b"> + ₹${monthly}/month</span>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 40px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#475569;line-height:1.7">
                <strong>Ready to proceed?</strong> Reply to this email or reach us on WhatsApp — we'll confirm everything and get started.
                ${wa.link ? `<br><br><a href="${escapeHtml(wa.link)}" style="display:inline-block;background:${brand.accent};color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">Chat on WhatsApp →</a>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;color:#94a3b8">${brand.name}</td>
              <td style="text-align:right;font-size:11px;color:#94a3b8">nexbaron.com</td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function renderQuotePdf(quote: IQuote): Promise<Buffer> {
  const brand = brandInfo(quote)
  const resp = quote.response
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = 595 - 112 // A4 minus margins

    // Header bar
    doc.rect(56, 56, pageWidth, 80).fill('#0f172a')
    doc.rect(56, 56, pageWidth, 4).fill(brand.accent)

    // Logo — NX monogram
    // Rounded rect background
    doc.roundedRect(70, 78, 44, 44, 10).fill('#0f172a')
    // Gradient border (approximated with accent stroke)
    doc.roundedRect(70, 78, 44, 44, 10).lineWidth(2).stroke(brand.accent)
    // NX paths
    doc.lineWidth(2.4).lineCap('round')
      .moveTo(92, 89).lineTo(92, 111).stroke('#94a3b8')
      .moveTo(92, 89).lineTo(107, 111).stroke('#94a3b8')
      .moveTo(107, 89).lineTo(107, 111).stroke('#94a3b8')

    // Brand name
    doc.fontSize(18).fillColor('#ffffff').text(brand.name, 114, 78)
    doc.fontSize(8).fillColor('#94a3b8').text(brand.tagline, 114, 100)

    // Quote number
    doc.fontSize(9).fillColor('#e2e8f0').text(`Quote: ${quote.quoteNumber}`, 114, 118, { align: 'right' })
    doc.fontSize(7).fillColor('#94a3b8').text(`Valid ${resp?.validityDays ?? 7} days`, 114, 130, { align: 'right' })

    doc.moveDown(4)

    // Greeting
    doc.fontSize(16).fillColor('#0f172a').text('Your Quote is Ready')
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#475569').text(`Hi ${quote.customer.name},`)
    doc.text(resp?.message || 'Here is your personalised quote.', { width: pageWidth })

    doc.moveDown(1.5)

    // Details table
    const y0 = doc.y
    const col1 = 70
    const rowH = 30

    // Row 1: Requested
    doc.rect(56, y0, pageWidth, rowH).fill('#f8fafc')
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('Requested', col1, y0 + 9)
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(selectionSummary(quote), 160, y0 + 8)

    // Row 2: Company (if present)
    let y = y0 + rowH
    if (quote.customer.company) {
      doc.rect(56, y, pageWidth, rowH).fill('#ffffff')
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('Company', col1, y + 9)
      doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(quote.customer.company, 160, y + 8)
      y += rowH
    }

    // Row 3: Price
    doc.rect(56, y, pageWidth, rowH).fill('#f8fafc')
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('Your Price', col1, y + 8)
    doc.font('Helvetica-Bold').fontSize(18).fillColor(brand.accent)
      .text(`₹${(resp?.price ?? 0).toLocaleString('en-IN')}`, 160, y + 5)
    if (resp?.monthlyPrice) {
      doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text(`+ ₹${resp.monthlyPrice.toLocaleString('en-IN')}/month`, 160 + doc.widthOfString(`₹${(resp?.price ?? 0).toLocaleString('en-IN')}`) + 8, y + 10)
    }

    // Footer
    doc.moveDown(4)
    doc.moveTo(56, doc.y).lineTo(56 + pageWidth, doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.5)
    doc.fontSize(8).fillColor('#94a3b8').text(brand.name, 56, doc.y, { width: pageWidth / 2, align: 'left' })
    doc.text('nexbaron.com', 56, doc.y - 10, { width: pageWidth, align: 'right' })

    doc.end()
  })
}

export async function sendQuoteEmail(quote: IQuote): Promise<boolean> {
  if (!canSendMail()) {
    logger.warn('SMTP not configured — skipping quote email')
    return false
  }
  const to = quote.customer.email
  if (!to) {
    logger.warn('No customer email — skipping quote email')
    return false
  }
  const brand = brandInfo(quote)
  const pdf = await renderQuotePdf(quote)
  try {
    await sendMail({
      from: brand.fromEmail,
      to,
      subject: `Your ${brand.name} quote ${quote.quoteNumber}`,
      html: quoteHtml(quote),
      attachments: [{ filename: `${quote.quoteNumber}.pdf`, content: pdf }],
    })
    return true
  } catch {
    return false
  }
}
