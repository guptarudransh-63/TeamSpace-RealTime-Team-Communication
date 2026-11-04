import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { sendMessageSchema, editMessageSchema, reactionSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(sendMessageSchema), requireWorkspaceMember(), messageController.sendMessage);
router.get('/channel/:channelId', messageController.getChannelMessages);
router.get('/conversation/:conversationId', messageController.getConversationMessages);
router.get('/thread/:messageId', messageController.getThread);
router.post('/:messageId/reactions', validate(reactionSchema), messageController.toggleReaction);
router.patch('/:messageId', validate(editMessageSchema), messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.post('/:messageId/pin', messageController.togglePin);

export default router;
