import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/permissions.js';

const router = Router();

router.use(requireAuth);

router.post('/direct', requireWorkspaceMember(), conversationController.getOrCreateDirectConversation);
router.post('/group', requireWorkspaceMember(), conversationController.createGroupDirectConversation);
router.get('/workspace/:workspaceId', requireWorkspaceMember(), conversationController.getUserConversations);

export default router;
