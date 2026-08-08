import { Request, Response } from 'express'
import { getDivisionModels } from '../../models/registry'
import { runtimeBrand } from '../../utils/runtime-brand'
import { logger } from '../../utils/logger'

/**
 * POST /{division}/chat — customer sends a chat message.
 * Works for both anonymous (sessionId) and authenticated (customerId) users.
 */
export async function customerSendMessage(req: Request, res: Response) {
  try {
    const division = runtimeBrand
    const { ChatMessage } = getDivisionModels(division)

    const message = await ChatMessage.create({
      division,
      customerId: req.userId || undefined,
      sessionId: req.body.sessionId || undefined,
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
    logger.error('customerSendMessage failed', error)
    res.status(500).json({ success: false, message: 'Failed to save message' })
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
export async function adminListChats(req: Request, res: Response) {
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
    const result = conversations.map((c: any) => ({
      ...c,
      customerName: c.names?.find((n: any) => n) || null,
      customerPhone: c.phones?.find((p: any) => p) || null,
      customerEmail: c.emails?.find((e: any) => e) || null,
      names: undefined, phones: undefined, emails: undefined,
    }))

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
