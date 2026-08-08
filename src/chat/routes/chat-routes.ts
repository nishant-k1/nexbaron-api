import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  customerSendMessage,
  customerGetChat,
  customerMergeChat,
  customerMarkRead,
  customerPresence,
  adminListChats,
  adminGetConversation,
  adminReplyToChat,
} from '../controllers/chat-controller'

import { optionalAuth } from '../../middleware/optional-auth'
import { rateLimit } from '../../utils/rate-limit'

// Customer routes (public + auth)
export const customerChatRouter = Router()
customerChatRouter.post('/chat', optionalAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }), customerSendMessage)
customerChatRouter.get('/chat', optionalAuth, customerGetChat)
customerChatRouter.post('/chat/read', optionalAuth, customerMarkRead)
customerChatRouter.post('/chat/presence', optionalAuth, rateLimit({ windowMs: 60 * 1000, max: 60 }), customerPresence)
customerChatRouter.post('/chat/merge', requireAuth, customerMergeChat)

// Admin routes
export const adminChatRouter = Router()
adminChatRouter.get('/chat', requireAdmin, requireDivision('digital', 'print'), adminListChats)
adminChatRouter.get('/chat/:conversationId', requireAdmin, requireDivision('digital', 'print'), adminGetConversation)
adminChatRouter.post('/chat/:conversationId/reply', requireAdmin, requireDivision('digital', 'print'), adminReplyToChat)
