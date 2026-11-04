import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { createWorkspaceSchema, inviteMemberSchema } from '../schemas/validationSchemas.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/:workspaceId', requireWorkspaceMember(), workspaceController.getWorkspace);
router.get('/:workspaceId/members', requireWorkspaceMember(), workspaceController.getWorkspaceMembers);
router.patch('/:workspaceId', requireWorkspaceMember(['owner', 'admin']), workspaceController.updateWorkspace);
router.post('/:workspaceId/invitations', requireWorkspaceMember(['owner', 'admin']), validate(inviteMemberSchema), workspaceController.inviteMember);
router.post('/invitations/:token/accept', workspaceController.acceptInvitation);
router.patch('/:workspaceId/members/:memberUserId/role', requireWorkspaceMember(['owner', 'admin']), workspaceController.updateMemberRole);
router.delete('/:workspaceId/members/:memberUserId', requireWorkspaceMember(['owner', 'admin']), workspaceController.removeMember);

export default router;
