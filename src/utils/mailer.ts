import nodemailer from 'nodemailer'
import { logger } from './logger'

interface MailOptions {
  from: string
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[]
}

const smtpConfig = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!smtpConfig.host || !smtpConfig.user) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    })
  }
  return transporter
}

export function canSendMail(): boolean {
  return !!getTransporter()
}

export async function sendMail(options: MailOptions): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    logger.warn('SMTP not configured — skipping email')
    return
  }

  try {
    await transport.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
    logger.info(`Email sent to ${options.to}`)
  } catch (error) {
    logger.error('Failed to send email', error)
    throw error
  }
}

// Helper to construct a from address per brand
export function fromAddress(user: string): string {
  const domain = process.env.SMTP_FROM_DOMAIN || 'nexbaron.com'
  return `${user}@${domain}`
}
