import { Router } from 'express';
import * as unreadController from '../controllers/unreadController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceMember } from '../middleware/permissions.js';

const router = Router();

router.use(requireAuth);

router.get('/workspace/:workspaceId', requireWorkspaceMember(), unreadController.getWorkspaceUnreads);
router.post('/read', requireWorkspaceMember(), unreadController.markTargetAsRead);

export default router;
