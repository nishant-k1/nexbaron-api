import PDFDocument from 'pdfkit'
import { computeBillingSummary } from './billing-service'

interface ReceiptOpts {
  paymentId?: string
}

export async function renderInvoiceReceiptPdf(
  invoice: any,
  account: any,
  opts: ReceiptOpts = {},
): Promise<Buffer> {
  const division: 'digital' | 'print' = invoice.division || account?.division || 'digital'
  const brand = division === 'digital'
    ? { name: 'Nexbaron Digital', accent: '#14b8a6' }
    : { name: 'Nexbaron Print', accent: '#f59e0b' }
  const summary = computeBillingSummary(invoice)
  const targetPayment = opts.paymentId
    ? (invoice.payments || []).find((p: any) => p.paymentId === opts.paymentId || p.razorpayPaymentId === opts.paymentId)
    : null
  const isSingle = !!targetPayment
  const receiptId = isSingle
    ? `${invoice.invoiceNumber}-${targetPayment.paymentId.slice(-6).toUpperCase()}`
    : invoice.invoiceNumber
  const receiptDate = isSingle ? new Date(targetPayment.at) : new Date(invoice.updatedAt || invoice.createdAt)
  const receiptAmount = isSingle ? targetPayment.amount : summary.totalPaid || invoice.amount

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width - 112
    const left = 56

    // Header
    doc.rect(left, 56, pageWidth, 4).fill(brand.accent)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(brand.name, left, 70)
    doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(isSingle ? 'Payment Receipt' : 'Invoice Receipt', left, 88)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(`Receipt: ${receiptId}`, left, 100, { width: pageWidth, align: 'right' })
    doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(receiptDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), left, 112, { width: pageWidth, align: 'right' })

    doc.moveTo(left, 130).lineTo(left + pageWidth, 130).strokeColor('#e2e8f0').lineWidth(0.5).stroke()

    // Invoice meta
    doc.y = 140
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(`Invoice ${invoice.invoiceNumber}`)
    doc.fillColor('#475569').font('Helvetica').fontSize(9).text(`Created: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}  ·  Status: ${invoice.status}  ·  Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '—'}`)
    doc.moveDown(1)

    // Bill to
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8).text('BILL TO', left, doc.y)
    doc.moveDown(0.3)
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(account?.name || invoice.accountId || '—')
    if (account?.email) doc.fillColor('#475569').font('Helvetica').fontSize(9).text(account.email)
    if (account?.phone) doc.text(account.phone)
    if (account?.accountCode) doc.fillColor('#94a3b8').fontSize(8).text(account.accountCode)
    doc.moveDown(1)

    // Line items
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text('Line Items')
    doc.moveDown(0.5)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke()
    doc.moveDown(0.5)
    for (const li of invoice.lineItems || []) {
      if (doc.y > 700) doc.addPage()
      const y = doc.y
      doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(li.label, left, y, { width: pageWidth - 120, continued: false })
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text(`₹${li.amount.toLocaleString('en-IN')}`, 0, y, { width: pageWidth, align: 'right' })
      doc.fillColor('#64748b').font('Helvetica').fontSize(7).text(li.type, left, doc.y, { width: pageWidth - 120 })
      doc.moveDown(0.3)
      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke()
      doc.moveDown(0.5)
    }
    // Totals
    if (doc.y > 680) doc.addPage()
    doc.moveDown(0.5)
    doc.fillColor('#475569').font('Helvetica').fontSize(9).text('Invoice Total', left, doc.y, { width: pageWidth - 120 })
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${invoice.amount.toLocaleString('en-IN')}`, 0, doc.y - 12, { width: pageWidth, align: 'right' })
    doc.moveDown(0.8)
    doc.fillColor('#475569').text('Total Paid', left, doc.y, { width: pageWidth - 120 })
    doc.fillColor('#059669').font('Helvetica-Bold').text(`₹${summary.totalPaid.toLocaleString('en-IN')}`, 0, doc.y - 12, { width: pageWidth, align: 'right' })
    doc.moveDown(0.8)
    doc.fillColor('#475569').font('Helvetica').text('Amount Due', left, doc.y, { width: pageWidth - 120 })
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${Math.max(0, invoice.amount - summary.totalPaid).toLocaleString('en-IN')}`, 0, doc.y - 12, { width: pageWidth, align: 'right' })
    if (isSingle) {
      doc.moveDown(0.8)
      doc.fillColor('#0f172a').font('Helvetica-Bold').text('This Receipt', left, doc.y, { width: pageWidth - 120 })
      doc.fillColor('#0f172a').text(`₹${receiptAmount.toLocaleString('en-IN')}`, 0, doc.y - 12, { width: pageWidth, align: 'right' })
    }
    doc.moveDown(1.5)

    // Payments
    if (doc.y > 650) doc.addPage()
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(isSingle ? 'Payment' : 'Payments')
    doc.moveDown(0.5)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke()
    doc.moveDown(0.5)
    const paymentsToShow = isSingle ? [targetPayment] : (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS')
    if (paymentsToShow.length === 0) {
      doc.fillColor('#94a3b8').font('Helvetica').fontSize(9).text('No payments')
      doc.moveDown(0.5)
    } else {
      for (const p of paymentsToShow) {
        if (doc.y > 700) doc.addPage()
        const y = doc.y
        const d = new Date(p.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const id = (p.razorpayPaymentId || p.paymentId).slice(-8).toUpperCase()
        doc.fillColor('#0f172a').font('Helvetica').fontSize(9).text(`${d} · ${id}`, left, y, { width: pageWidth - 120 })
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(`₹${p.amount.toLocaleString('en-IN')}`, 0, y, { width: pageWidth, align: 'right' })
        doc.fillColor('#059669').font('Helvetica').fontSize(7).text('Paid', left, doc.y, { width: pageWidth - 120 })
        doc.moveDown(0.3)
        doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke()
        doc.moveDown(0.5)
      }
    }

    // Footer
    if (doc.y > 750) doc.addPage()
    doc.moveDown(1)
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).stroke()
    doc.moveDown(0.8)
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(`${brand.name} · nexbaron.com · This is a computer-generated receipt. For support: hello@nexbaron.com`, left, doc.y, { width: pageWidth, align: 'center' })

    doc.end()
  })
}
