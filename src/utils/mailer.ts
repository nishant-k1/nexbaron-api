import nodemailer from 'nodemailer'
import { logger } from './logger'
import { requireEnv } from './env'
import { runtimeBrand } from '../config/brand'

interface MailOptions {
  from: string
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[]
}

function getTransporter(): nodemailer.Transporter | null {
  const brand = runtimeBrand
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env[`SMTP_${brand.toUpperCase()}_USER`]
  const pass = process.env[`SMTP_${brand.toUpperCase()}_PASS`]

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
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
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to send email')
    throw error
  }
}

// Helper to construct a from address per brand
export function fromAddress(user: string): string {
  const domain = requireEnv('SMTP_FROM_DOMAIN')
  return `${user}@${domain}`
}
