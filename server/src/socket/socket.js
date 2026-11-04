import { Server } from 'socket.io';
import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

let io = null;

// Track active socket connections per user to handle multi-tab presence safely
const activeUserSockets = new Map(); // userId -> Set of socket IDs

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Look for token in auth payload, query, or raw cookies
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [key, val] = cookie.trim().split('=');
          if (key === 'token') {
            token = decodeURIComponent(val);
            break;
          }
        }
      }

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('displayName realName avatarUrl');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error(`Socket authentication failed: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // 1. Join personal user room immediately
    socket.join(`user:${userId}`);

    // 2. Track connection for presence immediately (synchronous to prevent race condition on quick disconnect)
    const isFirstConnection = !activeUserSockets.has(userId);
    if (isFirstConnection) {
      activeUserSockets.set(userId, new Set());
    }
    activeUserSockets.get(userId).add(socket.id);

    (async () => {
      try {
        if (isFirstConnection) {
          await User.findByIdAndUpdate(userId, { presence: 'online', lastActiveAt: new Date() });
          io.emit('user_presence_changed', { userId, presence: 'online' });
        }

        const memberships = await WorkspaceMember.find({ userId }).select('workspaceId');
        memberships.forEach((m) => {
          socket.join(`ws:${m.workspaceId}`);
        });
      } catch (err) {
        console.error('[Socket Workspace Join Error]', err.message);
      }
    })();

    // Join Channel Event (with server-side authorization check)
    socket.on('join_channel', async ({ channelId }, callback) => {
      try {
        const channel = await Channel.findById(channelId);
        if (!channel) {
          if (callback) callback({ success: false, message: 'Channel not found' });
          return;
        }

        const wsMember = await WorkspaceMember.findOne({
          workspaceId: channel.workspaceId,
          userId,
        });

        if (!wsMember) {
          if (callback) callback({ success: false, message: 'Not a member of this workspace' });
          return;
        }

        if (channel.isPrivate) {
          const isChanMember = await ChannelMember.findOne({ channelId, userId });
          const isWsAdmin = ['owner', 'admin'].includes(wsMember.role);
          if (!isChanMember && !isWsAdmin) {
            if (callback) callback({ success: false, message: 'Not authorized for this private channel' });
            return;
          }
        }

        socket.join(`channel:${channelId}`);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('leave_channel', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
    });

    // Join Conversation Event (with participant verification)
    socket.on('join_conversation', async ({ conversationId }, callback) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          if (callback) callback({ success: false, message: 'Conversation not found' });
          return;
        }

        const isParticipant = conversation.participants.some(
          (p) => p.toString() === userId
        );

        if (!isParticipant) {
          if (callback) callback({ success: false, message: 'Not a participant in this conversation' });
          return;
        }

        socket.join(`conv:${conversationId}`);
        if (callback) callback({ success: true });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Join Thread Room
    socket.on('join_thread', ({ messageId }) => {
      socket.join(`thread:${messageId}`);
    });

    socket.on('leave_thread', ({ messageId }) => {
      socket.leave(`thread:${messageId}`);
    });

    // Typing Indicators (ephemeral)
    socket.on('typing_start', ({ conversationType, targetId }) => {
      const room = conversationType === 'channel' ? `channel:${targetId}` : `conv:${targetId}`;
      socket.to(room).emit('user_typing', {
        userId,
        displayName: socket.user.displayName,
        targetId,
      });
    });

    socket.on('typing_stop', ({ conversationType, targetId }) => {
      const room = conversationType === 'channel' ? `channel:${targetId}` : `conv:${targetId}`;
      socket.to(room).emit('user_stop_typing', {
        userId,
        targetId,
      });
    });

    // Reconnection Recovery of Missed Messages
    socket.on('recover_missed_messages', async ({ targetId, sinceTimestamp }, callback) => {
      try {
        if (!targetId || !sinceTimestamp) {
          if (callback) callback({ success: false, messages: [] });
          return;
        }

        const sinceDate = new Date(sinceTimestamp);
        const missedMessages = await Message.find({
          targetId,
          parentId: null,
          createdAt: { $gt: sinceDate },
        })
          .sort({ createdAt: 1, _id: 1 })
          .populate('senderId', 'displayName realName avatarUrl title')
          .populate('reactions.users', 'displayName avatarUrl')
          .populate('mentions', 'displayName');

        if (callback) {
          callback({
            success: true,
            messages: missedMessages,
          });
        }
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      const sockets = activeUserSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          activeUserSockets.delete(userId);
          // Small grace period to prevent flickering on tab refreshes
          setTimeout(async () => {
            if (!activeUserSockets.has(userId)) {
              await User.findByIdAndUpdate(userId, {
                presence: 'offline',
                lastActiveAt: new Date(),
              });
              io.emit('user_presence_changed', { userId, presence: 'offline' });
            }
          }, 3000);
        }
      }
    });
  });

  return io;
};

export const getSocketIO = () => io;
