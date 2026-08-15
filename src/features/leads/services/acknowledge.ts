import { ILead } from '../../../models/lead.model'
import { sendMail, canSendMail, fromAddress } from '../../../utils/mailer'
import { logoNx, escapeHtml, NX_DIGITAL, NX_PRINT } from '../../../utils/html'
import { logger } from '../../../utils/logger'

/**
 * Sends a brief acknowledgment to leads from public channels (web contact,
 * live chat) so the customer knows we received their inquiry.
 * Skips quote-request and checkout sources — those get their own flow.
 */
export async function sendLeadAcknowledgment(lead: ILead): Promise<void> {
  if (!lead.email || !canSendMail()) return
  if (lead.source === 'quote-request' || lead.source === 'checkout') return

  const brand = lead.division === 'digital' ? 'Nexbaron Digital' : 'Nexbaron Print'
  const colors = lead.division === 'digital' ? NX_DIGITAL : NX_PRINT
  const accent = colors.stop1
  const name = escapeHtml(lead.name || 'there')
  const source = lead.source === 'chat' ? 'live chat' : 'contact form'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>We got your message</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;padding:40px 16px;line-height:1.6}
.header{text-align:center;margin-bottom:32px}
.header h1{font-size:22px;color:#0f172a;margin:16px 0 4px}
.header p{font-size:14px;color:#64748b;margin:0}
.card{background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0}
.card p{font-size:14px;color:#334155;margin:0 0 12px}
.card .highlight{color:${accent};font-weight:600}
.footer{text-align:center;font-size:12px;color:#94a3b8;margin-top:32px}
.footer a{color:${accent};text-decoration:none}
</style></head><body>
<div class="header">
  ${logoNx(colors, 48, 48)}
  <h1>We got your message, ${name}</h1>
  <p>Thanks for reaching out through our ${source}</p>
</div>
<div class="card">
  <p>Your inquiry has been received and one of our team members will get back to you <span class="highlight">within 24 hours</span>.</p>
  <p>We are reviewing your request and will reach out with the best solution for your needs. No need to follow up — we've got this.</p>
</div>
<div class="footer">
  <p>${brand} &middot; <a href="https://nexbaron.com">nexbaron.com</a></p>
  <p>This is an automated acknowledgment of your inquiry.</p>
</div>
</body></html>`

  try {
    await sendMail({
      from: fromAddress('hello'),
      to: lead.email,
      subject: `Thanks for reaching out, ${name} — we'll get back soon`,
      html,
    })
    logger.info(`Lead acknowledgment sent to ${lead.email} (source: ${lead.source})`)
  } catch (error) {
    logger.error('sendLeadAcknowledgment failed', error)
  }
}
