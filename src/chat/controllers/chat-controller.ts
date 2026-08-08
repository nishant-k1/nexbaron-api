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
      message: req.body.message || '',
      attachments: req.body.attachments || undefined,
      name: req.body.name || undefined,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
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

    // Merge by sessionId
    const sessionResult = await ChatMessage.updateMany(
      { division, sessionId: req.body.sessionId, customerId: null },
      { $set: { customerId: req.userId } }
    )

    // Merge by phone (cross-device recovery)
    let phoneResult = { modifiedCount: 0 }
    if (req.body.phone) {
      phoneResult = await ChatMessage.updateMany(
        { division, phone: req.body.phone, customerId: null },
        { $set: { customerId: req.userId } }
      )
    }

    // Merge by email (cross-device recovery)
    let emailResult = { modifiedCount: 0 }
    if (req.body.email) {
      emailResult = await ChatMessage.updateMany(
        { division, email: req.body.email, customerId: null },
        { $set: { customerId: req.userId } }
      )
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

    // Mark as read
    await ChatMessage.updateMany(
      { division, customerId: conversationId, sender: 'customer', isRead: false },
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
      message: req.body.message,
      isRead: true,
    })

    res.status(201).json({ success: true, message: reply })
  } catch (error) {
    logger.error('adminReplyToChat failed', error)
    res.status(500).json({ success: false, message: 'Failed to send reply' })
  }
}
