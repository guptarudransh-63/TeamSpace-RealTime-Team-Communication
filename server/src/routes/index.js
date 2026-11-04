import { Router } from 'express';
import authRoutes from './authRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import channelRoutes from './channelRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import messageRoutes from './messageRoutes.js';
import fileRoutes from './fileRoutes.js';
import searchRoutes from './searchRoutes.js';
import unreadRoutes from './unreadRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/channels', channelRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/files', fileRoutes);
router.use('/search', searchRoutes);
router.use('/unread', unreadRoutes);
router.use('/notifications', notificationRoutes);

export default router;
