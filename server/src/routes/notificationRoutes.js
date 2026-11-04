import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', notificationController.getNotifications);
router.patch('/:notificationId/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);
router.get('/preferences/:workspaceId', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreference);

export default router;
