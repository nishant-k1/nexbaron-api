import { logger } from './logger'

/**
 * Posts a server-authored agent message into a customer's chat conversation via
 * the dedicated chat service. Used when an admin publishes a custom package so
 * the customer gets the "package tailored" notice. No-op (with a warning) when
 * the chat service URL/secret is not configured.
 */
export async function notifyChatAgentMessage(
  division: 'digital' | 'print',
  customerId: string,
  message: string
): Promise<void> {
  const base = process.env.CHAT_SERVICE_URL
  const secret = process.env.CHAT_INTERNAL_SECRET
  if (!base || !secret) {
    logger.warn('notifyChatAgentMessage skipped: CHAT_SERVICE_URL/CHAT_INTERNAL_SECRET not set')
    return
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/${division}/internal/agent-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': secret },
      body: JSON.stringify({ customerId, message }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.warn(`notifyChatAgentMessage failed: ${res.status} ${text}`)
    }
  } catch (error) {
    logger.warn(`notifyChatAgentMessage error: ${error instanceof Error ? error.message : String(error)}`)
  }
}
