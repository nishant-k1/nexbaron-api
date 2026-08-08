import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireAdmin, requireDivision } from '../../admin/middleware/require-admin'
import {
  customerSendMessage,
  customerGetChat,
  customerMergeChat,
  adminListChats,
  adminGetConversation,
  adminReplyToChat,
} from '../controllers/chat-controller'

import { optionalAuth } from '../../middleware/optional-auth'

// Customer routes (public + auth)
export const customerChatRouter = Router()
customerChatRouter.post('/chat', optionalAuth, customerSendMessage)
customerChatRouter.get('/chat', optionalAuth, customerGetChat)
customerChatRouter.post('/chat/merge', requireAuth, customerMergeChat)

// Admin routes
export const adminChatRouter = Router()
adminChatRouter.get('/chat', requireAdmin, requireDivision('digital', 'print'), adminListChats)
adminChatRouter.get('/chat/:conversationId', requireAdmin, requireDivision('digital', 'print'), adminGetConversation)
adminChatRouter.post('/chat/:conversationId/reply', requireAdmin, requireDivision('digital', 'print'), adminReplyToChat)
