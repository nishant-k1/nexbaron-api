import PDFDocument from 'pdfkit'
import { IProposal } from '../../../models/proposal.model'

function inr(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export async function renderProposalPdf(proposal: IProposal | any, account: any): Promise<Buffer> {
  const division: 'digital' | 'print' = proposal.division || 'digital'
  const brand = division === 'digital'
    ? { name: 'Nexbaron Digital', accent: '#14b8a6', accentLight: '#ccfbf1', tagline: 'Your website & growth partner' }
    : { name: 'Nexbaron Print', accent: '#f59e0b', accentLight: '#fef3c7', tagline: 'Commercial printing, done right' }
  const p = proposal.pricing || {}
  const totalAmount = (p.oneTimeFee || 0) + (p.recurringFee || 0)
  const validTill = new Date(new Date(proposal.updatedAt || proposal.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000)
  const createdDate = new Date(proposal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const validDate = validTill.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageW = doc.page.width - 112
    const left = 56

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - 50) {
        doc.addPage()
      }
    }

    // Header bar
    doc.save()
    doc.rect(left, 44, pageW, 64).fill('#0f172a')
    doc.rect(left, 44, pageW, 4).fill(brand.accent)
    // NX monogram
    doc.roundedRect(left + 12, 54, 44, 44, 10).fill('#0f172a')
    doc.roundedRect(left + 12, 54, 44, 44, 10).lineWidth(2).stroke(brand.accent)
    doc.lineWidth(2.2).lineCap('round').strokeColor('#94a3b8')
      .moveTo(left + 24, 64).lineTo(left + 24, 88).stroke()
      .moveTo(left + 24, 64).lineTo(left + 44, 88).stroke()
      .moveTo(left + 44, 64).lineTo(left + 44, 88).stroke()
    doc.restore()
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14).text(brand.name, left + 62, 58)
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(brand.tagline, left + 62, 76)
    doc.fillColor('#e2e8f0').font('Helvetica').fontSize(7).text(`Proposal  ${proposal.proposalCode}`, left, 62, { width: pageW, align: 'right' })
    doc.fillColor('#e2e8f0').font('Helvetica').fontSize(7).text(`Valid till ${validDate}`, left, 72, { width: pageW, align: 'right' })
    doc.fillColor('#e2e8f0').font('Helvetica').fontSize(7).text(`Version ${proposal.version}`, left, 82, { width: pageW, align: 'right' })

    doc.y = 118
    // Title
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(proposal.title || 'Proposal')
    if (proposal.description) {
      doc.moveDown(0.3)
      doc.fillColor('#475569').font('Helvetica').fontSize(9).text(proposal.description, { width: pageW })
    }
    doc.moveDown(0.8)
    doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(`Package ${proposal.packageId} · ${inr(totalAmount)} total`, { width: pageW })

    // Bill-to
    doc.moveDown(0.8)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageW, doc.y).stroke()
    doc.moveDown(0.6)
    const billY = doc.y
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text('PREPARED FOR', left, billY)
    doc.moveDown(0.4)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(account?.name || '—')
    if (account?.company) doc.fillColor('#475569').font('Helvetica').fontSize(8).text(account.company)
    if (account?.email) doc.text(account.email)
    if (account?.phone) doc.text(account.phone)
    if (account?.accountCode) doc.fillColor('#94a3b8').fontSize(7).text(account.accountCode)
    const rightX = left + pageW - 160
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text('PROPOSAL INFO', rightX, billY)
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8).text(`Date: ${createdDate}`, rightX, billY + 12)
    doc.text(`Valid: ${validDate}`, rightX, doc.y)
    doc.text(`Status: ${proposal.status}`, rightX, doc.y)

    doc.moveDown(1)

    // What's included
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text("What's included")
    doc.moveDown(0.4)
    doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(`${(proposal.services || []).length} service(s) — scope as agreed`, { width: pageW })
    doc.moveDown(0.4)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageW, doc.y).stroke()
    doc.moveDown(0.4)
    if (!proposal.services || proposal.services.length === 0) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text('No services listed.', left, doc.y)
      doc.moveDown(0.6)
    } else {
      for (const s of proposal.services) {
        const y = doc.y
        // bullet
        doc.fillColor(brand.accent).circle(left + 4, y + 5, 2).fill()
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text(s.name || s.serviceCode, left + 12, y, { width: pageW - 12 })
        if (s.description) {
          doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(s.description, left + 12, doc.y, { width: pageW - 12 })
        }
        doc.moveDown(0.4)
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageW, doc.y).stroke()
        doc.moveDown(0.4)
      }
    }

    ensureSpace(100)

    // Commercials
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Commercials')
    doc.moveDown(0.4)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageW, doc.y).stroke()
    doc.moveDown(0.4)
    const colW = pageW / 2 - 8
    const cardY = doc.y
    const cardH = 62
    // One-time
    doc.roundedRect(left, cardY, colW, cardH, 8).strokeColor('#e2e8f0').lineWidth(0.6).stroke()
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text('ONE-TIME', left + 10, cardY + 10)
    if (p.oneTimeEnabled) {
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(inr(p.oneTimeFee || 0), left + 10, cardY + 22)
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(p.paymentSchedule === 'FIFTY_FIFTY' ? '50 / 50' : 'Full upfront', left + 10, cardY + 40)
    } else {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text('Not included', left + 10, cardY + 24)
    }
    // Recurring
    doc.roundedRect(left + colW + 16, cardY, colW, cardH, 8).strokeColor('#e2e8f0').lineWidth(0.6).stroke()
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text('RECURRING', left + colW + 26, cardY + 10)
    if (p.recurringEnabled) {
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(inr(p.recurringFee || 0), left + colW + 26, cardY + 22)
      const freq = p.recurringFrequency === 'ANNUAL' ? 'per year' : 'per month'
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(freq, left + colW + 26, cardY + 40)
    } else {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text('Not included', left + colW + 26, cardY + 24)
    }
    doc.y = cardY + cardH + 10
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(`Total: ${inr(totalAmount)}`, left, doc.y, { width: pageW, align: 'right' })
    doc.moveDown(0.6)
    doc.fillColor('#64748b').font('Helvetica').fontSize(7).text('GST 18% extra as applicable. Amounts in INR.', left, doc.y, { width: pageW, align: 'right' })

    ensureSpace(90)

    // Timeline
    doc.moveDown(0.8)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Timeline')
    doc.moveDown(0.3)
    const tl = (proposal as any).timeline || (proposal as any).expectedTimeline || ''
    if (tl) {
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text(String(tl), { width: pageW })
    } else {
      const tText = proposal.packageId === 'scale' ? 'Foundation 30 days (phased), then build & launch' : proposal.title?.toLowerCase().includes('starter') ? 'Typically 5–7 business days' : 'Typically 7–14 business days'
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text(tText, { width: pageW })
    }
    doc.moveDown(0.6)
    // simple 5-stage bar
    const stages = ['Payment', 'Kickoff', 'Build', 'Review', 'Go live']
    const segW = pageW / stages.length
    const barY = doc.y + 8
    doc.strokeColor(brand.accent).lineWidth(3).moveTo(left, barY).lineTo(left + pageW, barY).stroke()
    stages.forEach((s, i) => {
      const cx = left + segW * (i + 0.5)
      doc.fillColor('#ffffff').circle(cx, barY, 5).fill()
      doc.strokeColor(brand.accent).lineWidth(1.5).circle(cx, barY, 5).stroke()
      doc.fillColor('#0f172a').font('Helvetica').fontSize(6).text(s, cx - segW / 2, barY + 10, { width: segW, align: 'center' })
    })
    doc.y = barY + 28

    ensureSpace(80)

    // Terms
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Terms & conditions')
    doc.moveDown(0.3)
    const terms = (proposal.terms || 'No specific terms provided. This proposal is valid for 30 days from the date of issue.').toString().trim()
    doc.fillColor('#475569').font('Helvetica').fontSize(7).text(terms, { width: pageW })
    doc.moveDown(0.6)
    doc.fillColor('#64748b').font('Helvetica').fontSize(6).text('Valid for 30 days · One revision included · Changes beyond scope may be billed separately.', { width: pageW })

    ensureSpace(90)

    // Acceptance
    doc.moveDown(0.8)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageW, doc.y).stroke()
    doc.moveDown(0.6)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Acceptance')
    doc.moveDown(0.3)
    if (proposal.status === 'ACCEPTED' && proposal.acceptedAt) {
      const d = new Date(proposal.acceptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(8).text(`Accepted by ${proposal.acceptedBy || '—'} on ${d}`, { width: pageW })
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(`Proposal ${proposal.proposalCode} · v${proposal.version}`, { width: pageW })
    } else {
      doc.fillColor('#475569').font('Helvetica').fontSize(8).text('By accepting, you agree to the terms above. Acceptance is recorded digitally in the Hub.', { width: pageW })
      doc.moveDown(0.4)
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(`Proposal ${proposal.proposalCode} · v${proposal.version} · Awaiting acceptance`, { width: pageW })
    }

    // Next steps
    doc.moveDown(0.8)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8).text('Next steps:  Accept → Pay (50% advance or full) → Kickoff → Build → Launch')

    // Footers for all buffered pages
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      const bottom = 750
      doc.save()
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, bottom).lineTo(left + pageW, bottom).stroke()
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(7).text(`${brand.name} · nexbaron.com · Page ${i + 1}`, left, bottom + 8, { width: pageW, align: 'center' })
      doc.restore()
    }
    doc.end()
  })
}
