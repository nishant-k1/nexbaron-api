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
    ? { name: 'Nexbaron Digital', accent: '#14b8a6', tagline: 'Your website & growth partner' }
    : { name: 'Nexbaron Print', accent: '#f59e0b', tagline: 'Commercial printing, done right' }
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

    const pageWidth = 595 - 112

    // Header bar
    doc.rect(56, 56, pageWidth, 80).fill('#0f172a')
    doc.rect(56, 56, pageWidth, 4).fill(brand.accent)
    // Logo NX
    doc.roundedRect(70, 78, 44, 44, 10).fill('#0f172a')
    doc.roundedRect(70, 78, 44, 44, 10).lineWidth(2).stroke(brand.accent)
    doc.lineWidth(2.4).lineCap('round').moveTo(92, 89).lineTo(92, 111).stroke('#94a3b8').moveTo(92, 89).lineTo(107, 111).stroke('#94a3b8').moveTo(107, 89).lineTo(107, 111).stroke('#94a3b8')
    doc.fontSize(18).fillColor('#ffffff').text(brand.name, 114, 78)
    doc.fontSize(8).fillColor('#94a3b8').text(brand.tagline, 114, 100)
    doc.fontSize(9).fillColor('#e2e8f0').text(`Receipt: ${receiptId}`, 114, 118, { align: 'right' })
    doc.fontSize(7).fillColor('#94a3b8').text(receiptDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 114, 130, { align: 'right' })

    doc.moveDown(4)
    doc.fontSize(16).fillColor('#0f172a').text(isSingle ? 'Payment Receipt' : 'Invoice Receipt')
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor('#475569').text(`Invoice ${invoice.invoiceNumber} · ${new Date(invoice.createdAt).toLocaleDateString('en-IN')} · ${invoice.status}`)

    doc.moveDown(1)
    // Bill to
    const y0 = doc.y
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('BILL TO', 56, y0)
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(account?.name || invoice.accountId || '—', 56, y0 + 12)
    if (account?.email) doc.text(account.email, 56, doc.y)
    if (account?.phone) doc.text(account.phone, 56, doc.y)
    if (account?.accountCode) doc.fontSize(8).fillColor('#94a3b8').text(account.accountCode, 56, doc.y)
    const yBillToEnd = doc.y

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('INVOICE', 350, y0)
    doc.fontSize(10).fillColor('#0f172a').text(invoice.invoiceNumber, 350, y0 + 12)
    doc.fontSize(9).fillColor('#475569').text(`Amount: ₹${invoice.amount.toLocaleString('en-IN')}`, 350, doc.y)
    if (isSingle) doc.text(`This receipt: ₹${receiptAmount.toLocaleString('en-IN')}`, 350, doc.y)

    doc.y = Math.max(yBillToEnd, doc.y) + 16

    // Line items table
    const tableTop = doc.y
    const colDesc = 56
    const colAmt = 56 + pageWidth - 100
    const colType = 56 + pageWidth - 50
    // Header
    doc.rect(56, tableTop, pageWidth, 22).fill('#f8fafc')
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DESCRIPTION', colDesc + 6, tableTop + 7)
    doc.text('AMOUNT', colAmt, tableTop + 7, { width: 90, align: 'right' })
    doc.text('TYPE', colType, tableTop + 7, { width: 40, align: 'center' })
    let y = tableTop + 22
    const rowH = 20
    for (const li of invoice.lineItems || []) {
      if (y > 720) { doc.addPage(); y = 56 }
      doc.rect(56, y, pageWidth, rowH).strokeColor('#f1f5f9').stroke()
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(li.label, colDesc + 6, y + 6, { width: colAmt - colDesc - 10 })
      doc.text(`₹${li.amount.toLocaleString('en-IN')}`, colAmt, y + 6, { width: 90, align: 'right' })
      doc.fontSize(7).fillColor('#94a3b8').text(li.type, colType, y + 7, { width: 40, align: 'center' })
      y += rowH
    }
    // Totals
    if (y > 700) { doc.addPage(); y = 56 }
    y += 6
    doc.font('Helvetica').fontSize(9).fillColor('#475569').text('Invoice Total', colAmt - 80, y, { width: 80, align: 'right' })
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`₹${invoice.amount.toLocaleString('en-IN')}`, colAmt, y, { width: 90, align: 'right' })
    y += 14
    doc.text('Total Paid', colAmt - 80, y, { width: 80, align: 'right' })
    doc.fillColor('#059669').text(`₹${summary.totalPaid.toLocaleString('en-IN')}`, colAmt, y, { width: 90, align: 'right' })
    y += 14
    doc.fillColor('#475569').text('Amount Due', colAmt - 80, y, { width: 80, align: 'right' })
    doc.text(`₹${Math.max(0, invoice.amount - summary.totalPaid).toLocaleString('en-IN')}`, colAmt, y, { width: 90, align: 'right' })
    if (isSingle) {
      y += 14
      doc.fillColor('#0f172a').font('Helvetica-Bold').text('This Receipt', colAmt - 80, y, { width: 80, align: 'right' })
      doc.text(`₹${receiptAmount.toLocaleString('en-IN')}`, colAmt, y, { width: 90, align: 'right' })
    }

    doc.y = y + 24
    // Payments table
    const payTop = doc.y
    doc.rect(56, payTop, pageWidth, 22).fill('#f8fafc')
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text(isSingle ? 'PAYMENT' : 'PAYMENTS', colDesc + 6, payTop + 7)
    doc.text('AMOUNT', colAmt, payTop + 7, { width: 90, align: 'right' })
    doc.text('STATUS', colType, payTop + 7, { width: 40, align: 'center' })
    y = payTop + 22
    const paymentsToShow = isSingle ? [targetPayment] : (invoice.payments || []).filter((p: any) => p.status === 'SUCCESS')
    if (paymentsToShow.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text('No payments', colDesc + 6, y + 6)
      y += rowH
    } else {
      for (const p of paymentsToShow) {
        if (y > 720) { doc.addPage(); y = 56 }
        doc.rect(56, y, pageWidth, rowH).strokeColor('#f1f5f9').stroke()
        const d = new Date(p.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const id = (p.razorpayPaymentId || p.paymentId).slice(-8).toUpperCase()
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text(`${d} · ${id}`, colDesc + 6, y + 6, { width: colAmt - colDesc - 10 })
        doc.text(`₹${p.amount.toLocaleString('en-IN')}`, colAmt, y + 6, { width: 90, align: 'right' })
        doc.fontSize(7).fillColor('#059669').text('Paid', colType, y + 7, { width: 40, align: 'center' })
        y += rowH
      }
    }
    doc.y = y + 16
    // Footer
    doc.moveTo(56, doc.y).lineTo(56 + pageWidth, doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.5)
    doc.fontSize(8).fillColor('#94a3b8').text(brand.name, 56, doc.y, { width: pageWidth / 2 })
    doc.text('nexbaron.com · This is a computer-generated receipt. For support: hello@nexbaron.com', 56, doc.y - 10, { width: pageWidth, align: 'right' })

    doc.end()
  })
}
