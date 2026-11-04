import { Router } from 'express';
import * as channelController from '../controllers/channelController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember, requireChannelAccess } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { createChannelSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createChannelSchema), requireWorkspaceMember(), channelController.createChannel);
router.get('/workspace/:workspaceId', requireWorkspaceMember(), channelController.getWorkspaceChannels);
router.get('/:channelId', requireChannelAccess(), channelController.getChannelDetails);
router.get('/:channelId/members', requireChannelAccess(), channelController.getChannelMembers);
router.post('/:channelId/join', requireChannelAccess(), channelController.joinChannel);
router.post('/:channelId/leave', requireChannelAccess(), channelController.leaveChannel);
router.post('/:channelId/invite', requireChannelAccess({ requireWrite: true }), channelController.inviteToChannel);
router.patch('/:channelId', requireChannelAccess({ requireWrite: true }), channelController.updateChannel);
router.post('/:channelId/archive', requireChannelAccess({ requireWrite: true }), channelController.archiveChannel);
router.get('/:channelId/pins', requireChannelAccess(), channelController.getPinnedMessages);

export default router;
