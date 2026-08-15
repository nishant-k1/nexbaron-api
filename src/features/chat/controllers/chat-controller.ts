import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getDivisionModels } from '../../../models/registry'
import { runtimeBrand } from '../../../utils/runtime-brand'
import { logger } from '../../../utils/logger'
import { getNextStaffForAssignment } from '../../leads/services/auto-assign'
import { sendLeadAcknowledgment } from '../../leads/services/acknowledge'

/**
 * POST /{division}/chat — customer sends a chat message.
 * Works for both anonymous (sessionId) and authenticated (customerId) users.
 */
export async function customerSendMessage(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage, Lead } = getDivisionModels(division)
    const name = String(req.body.name || '').trim()
    const phone = String(req.body.phone || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()

    let projectId: string | null = null

    if (name && (email || phone)) {
      const projectIdForLead = randomUUID()
      const leadMatch: Record<string, unknown> = { division }
      if (email) leadMatch.email = email
      else leadMatch.phone = phone

      const existingLead = await Lead.findOne(leadMatch).lean()
      if (existingLead) {
        projectId = existingLead.projectId
      } else {
        const newLead = await Lead.create({
          division,
          projectId: projectIdForLead,
          source: 'chat',
          name,
          email: email || undefined,
          phone: phone || undefined,
          message: String(req.body.message || '').slice(0, 500),
          status: 'new',
        })
        projectId = projectIdForLead
        void autoAssignChatLead(newLead)
        void sendLeadAcknowledgment(newLead)
      }
    }

    const message = await ChatMessage.create({
      division,
      projectId: projectId || undefined,
      customerId: req.userId || undefined,
      sessionId: req.body.sessionId || undefined,
      sender: 'customer',
      message: String(req.body.message || '').slice(0, 2000),
      attachments: req.body.attachments || undefined,
      name: name || undefined,
      phone: phone || undefined,
      email: email || undefined,
      lastSeen: new Date(),
    })

    res.status(201).json({
      success: true,
      message: { id: message._id, createdAt: message.createdAt },
      ...(projectId ? { projectId } : {}),
    })
  } catch (error) {
    logger.error('customerSendMessage failed', error)
    res.status(500).json({ success: false, message: 'Failed to save message' })
  }
}

async function autoAssignChatLead(lead: { _id: any; division: string; assignedStaff?: string }) {
  if (lead.assignedStaff) return
  try {
    const staffName = await getNextStaffForAssignment(lead.division)
    if (!staffName) return
    const { Lead } = getDivisionModels(lead.division as 'digital' | 'print')
    await Lead.updateOne({ _id: lead._id }, { $set: { assignedStaff: staffName } })
    logger.info(`Chat lead ${lead._id} auto-assigned to ${staffName}`)
  } catch (error) {
    logger.error('autoAssignChatLead failed', error)
  }
}

/**
 * GET /{division}/chat — customer fetches their chat history.
 * Matches by customerId (if authenticated) or sessionId.
 */
export async function customerGetChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const filter: Record<string, unknown> = { division }

    if (req.userId) {
      filter.customerId = req.userId
      // Also pull in any anonymous session messages tied to this sessionId
      if (req.query.sessionId) {
        delete filter.customerId
        filter.$or = [
          { customerId: req.userId },
          { sessionId: req.query.sessionId as string },
        ]
      }
    } else if (req.query.sessionId) {
      filter.sessionId = req.query.sessionId
    } else {
      res.status(400).json({ success: false, message: 'Provide sessionId or authenticate' })
      return
    }

    const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).limit(200).lean()
    res.json({ success: true, messages })
  } catch (error) {
    logger.error('customerGetChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to load chat' })
  }
}

/**
 * POST /{division}/chat/read — customer marks agent messages as read.
 * Matches by customerId (authenticated) or sessionId, mirroring customerGetChat.
 */
export async function customerMarkRead(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const filter: Record<string, unknown> = { division, sender: 'agent', isRead: false }

    if (req.userId) {
      filter.$or = [{ customerId: req.userId }]
      if (req.body.sessionId) (filter.$or as unknown[]).push({ sessionId: req.body.sessionId })
    } else if (req.body.sessionId) {
      filter.sessionId = req.body.sessionId
    } else {
      res.status(400).json({ success: false, message: 'Provide sessionId or authenticate' })
      return
    }

    const result = await ChatMessage.updateMany(filter, { $set: { isRead: true } })
    res.json({ success: true, marked: result.modifiedCount })
  } catch (error) {
    logger.error('customerMarkRead failed', error)
    res.status(500).json({ success: false, message: 'Failed to mark messages as read' })
  }
}

/**
 * POST /{division}/chat/presence — customer heartbeat. Updates the lastSeen of
 * their conversation so the CRM can show accurate online status. A single
 * document per conversation is updated (the most recent message), keeping the
 * write cheap.
 */
export async function customerPresence(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const filter: Record<string, unknown> = { division }
    if (req.userId) {
      filter.$or = [{ customerId: req.userId }]
      if (req.body.sessionId) (filter.$or as unknown[]).push({ sessionId: req.body.sessionId })
    } else if (req.body.sessionId) {
      filter.sessionId = req.body.sessionId
    } else {
      res.status(400).json({ success: false, message: 'Provide sessionId or authenticate' })
      return
    }

    const latest = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(1).select('_id').lean()
    if (latest.length > 0) {
      await ChatMessage.updateOne(
        { _id: latest[0]._id },
        { $set: { lastSeen: new Date() } }
      )
    }

    res.json({ success: true })
  } catch (error) {
    logger.error('customerPresence failed', error)
    res.status(500).json({ success: false, message: 'Presence update failed' })
  }
}

/**
 * POST /{division}/chat/merge — after login, merge anonymous session messages into customer.
 */
export async function customerMergeChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    if (!req.userId || !req.body.sessionId) {
      res.status(400).json({ success: false, message: 'Requires auth and sessionId' })
      return
    }

    const mergeSet: Record<string, unknown> = { customerId: req.userId }
    if (req.body.name) mergeSet.name = String(req.body.name).slice(0, 100)

    // Merge by sessionId
    const sessionResult = await ChatMessage.updateMany(
      { division, sessionId: req.body.sessionId, customerId: null },
      { $set: mergeSet }
    )

    // Merge by phone (cross-device recovery) — only if no OTHER customer owns it
    let phoneResult = { modifiedCount: 0 }
    if (req.body.phone) {
      const owned = await ChatMessage.exists({
        division, phone: req.body.phone, customerId: { $nin: [null, req.userId] },
      })
      if (!owned) {
        phoneResult = await ChatMessage.updateMany(
          { division, phone: req.body.phone, customerId: null },
          { $set: mergeSet }
        )
      }
    }

    // Merge by email (cross-device recovery) — only if no OTHER customer owns it
    let emailResult = { modifiedCount: 0 }
    if (req.body.email) {
      const owned = await ChatMessage.exists({
        division, email: req.body.email, customerId: { $nin: [null, req.userId] },
      })
      if (!owned) {
        emailResult = await ChatMessage.updateMany(
          { division, email: req.body.email, customerId: null },
          { $set: mergeSet }
        )
      }
    }

    res.json({ success: true, merged: sessionResult.modifiedCount + phoneResult.modifiedCount + emailResult.modifiedCount })
  } catch (error) {
    logger.error('customerMergeChat failed', error)
    res.status(500).json({ success: false, message: 'Merge failed' })
  }
}

/**
 * GET /{division}/admin/chat — admin lists chat conversations (grouped by customerId).
 */
export async function adminListChats(_req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    // Aggregate to group conversations
    const conversations = await ChatMessage.aggregate([
      { $match: { division } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $ifNull: ['$customerId', '$sessionId'] },
          names: { $push: '$name' },
          phones: { $push: '$phone' },
          emails: { $push: '$email' },
          customerId: { $first: '$customerId' },
          lastMessage: { $first: '$message' },
          lastSender: { $first: '$sender' },
          lastAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'customer'] }, { $eq: ['$isRead', false] }] }, 1, 0] },
          },
          lastSeen: { $max: '$lastSeen' },
          totalMessages: { $sum: 1 },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ])

    // Post-process: extract first non-null name/phone/email from each conversation
    const now = Date.now()
    const DAY_MS = 86400000
    const result = conversations
      .map((c: any) => ({
        ...c,
        customerName: c.names?.find((n: any) => n && !/@/.test(n) && n.length < 50) || null,
        customerPhone: c.phones?.find((p: any) => p && /^[+\d]/.test(p)) || null,
        customerEmail: c.emails?.find((e: any) => e && e.includes('@')) || null,
        names: undefined, phones: undefined, emails: undefined,
      }))
      .filter((c: any) => {
        const isIdentified = c.customerName || c.customerPhone || c.customerEmail
        const isRecent = c.lastAt && (now - new Date(c.lastAt).getTime() < DAY_MS)
        const hasUnread = c.unreadCount > 0
        return isIdentified || isRecent || hasUnread
      })

    res.json({ success: true, conversations: result })
  } catch (error) {
    logger.error('adminListChats failed', error)
    res.status(500).json({ success: false, message: 'Failed to load chats' })
  }
}

/**
 * GET /{division}/admin/chat/:conversationId — admin reads a single conversation.
 */
export async function adminGetConversation(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const conversationId = req.params.conversationId

    const messages = await ChatMessage.find({
      division,
      $or: [{ customerId: conversationId }, { sessionId: conversationId }],
    }).sort({ createdAt: 1 }).limit(200).lean()

    // Mark as read — matches both authenticated (customerId) and anonymous
    // (sessionId) conversations so unread badges clear for everyone.
    await ChatMessage.updateMany(
      {
        division,
        sender: 'customer',
        isRead: false,
        $or: [{ customerId: conversationId }, { sessionId: conversationId }],
      },
      { $set: { isRead: true } }
    )

    res.json({ success: true, messages })
  } catch (error) {
    logger.error('adminGetConversation failed', error)
    res.status(500).json({ success: false, message: 'Failed to load conversation' })
  }
}

/**
 * POST /{division}/admin/chat/:conversationId/reply — admin replies to a conversation.
 */
export async function adminReplyToChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const conversationId = req.params.conversationId

    // Find the original message to get customerId/sessionId
    const original = await ChatMessage.findOne({
      division,
      $or: [{ customerId: conversationId }, { sessionId: conversationId }],
    }).sort({ createdAt: 1 })

    if (!original) {
      res.status(404).json({ success: false, message: 'Conversation not found' })
      return
    }

    const reply = await ChatMessage.create({
      division,
      customerId: original.customerId,
      sessionId: original.sessionId,
      sender: 'agent',
      message: String(req.body.message || '').slice(0, 2000),
      attachments: req.body.attachments || undefined,
      // Agent replies start UNREAD for the customer — the Hub/web mark them read
      // via POST /chat/read when the customer views the thread.
      isRead: false,
    })

    res.status(201).json({ success: true, message: reply })
  } catch (error) {
    logger.error('adminReplyToChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to send reply' })
  }
}

/**
 * GET /{division}/chat/project/:projectId — customer fetches project-scoped chat.
 */
export async function customerGetProjectChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)
    const projectId = String(req.params.projectId)

    const filter: Record<string, unknown> = { division, projectId }
    if (req.userId) {
      filter.customerId = req.userId
    } else if (req.query.sessionId) {
      filter.sessionId = String(req.query.sessionId)
    }

    const messages = await ChatMessage.find(filter).sort({ createdAt: 1 }).limit(200).lean()
    res.json({ success: true, messages })
  } catch (error) {
    logger.error('customerGetProjectChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to load project chat' })
  }
}

/**
 * POST /{division}/chat/project/:projectId — customer sends project-scoped message.
 */
export async function customerSendProjectMessage(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)
    const projectId = String(req.params.projectId)

    const message = await ChatMessage.create({
      division,
      projectId,
      customerId: req.userId || undefined,
      sessionId: String(req.body.sessionId || ''),
      sender: 'customer',
      message: String(req.body.message || '').slice(0, 2000),
      attachments: req.body.attachments || undefined,
      name: req.body.name || undefined,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      lastSeen: new Date(),
    })

    res.status(201).json({ success: true, message: { id: message._id, createdAt: message.createdAt } })
  } catch (error) {
    logger.error('customerSendProjectMessage failed', error)
    res.status(500).json({ success: false, message: 'Failed to save message' })
  }
}

/**
 * GET /{division}/admin/chat/project/:projectId — admin fetches project chat.
 */
export async function adminGetProjectChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)
    const { projectId } = req.params

    const messages = await ChatMessage.find({ division, projectId }).sort({ createdAt: 1 }).limit(200).lean()

    await ChatMessage.updateMany(
      { division, projectId, sender: 'customer', isRead: false },
      { $set: { isRead: true } }
    )

    res.json({ success: true, messages })
  } catch (error) {
    logger.error('adminGetProjectChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to load project chat' })
  }
}

/**
 * POST /{division}/admin/chat/project/:projectId/reply — admin replies to project chat.
 */
export async function adminReplyToProjectChat(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)
    const projectId = String(req.params.projectId)

    const reply = await ChatMessage.create({
      division,
      projectId,
      customerId: String(req.body.customerId || ''),
      sessionId: String(req.body.sessionId || ''),
      sender: 'agent',
      message: String(req.body.message || '').slice(0, 2000),
      attachments: req.body.attachments || undefined,
      isRead: false,
    })

    res.status(201).json({ success: true, message: reply })
  } catch (error) {
    logger.error('adminReplyToProjectChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to send reply' })
  }
}
