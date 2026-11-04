import * as messageService from '../services/messageService.js';
import { Message } from '../models/Message.js';
import { getSocketIO } from '../socket/socket.js';

export const sendMessage = async (req, res, next) => {
  try {
    const {
      workspaceId,
      conversationType,
      targetId,
      content,
      structuredContent,
      parentId = null,
      attachments = [],
      idempotencyKey,
    } = req.body;

    const { message, isDuplicate } = await messageService.createMessage({
      workspaceId,
      conversationType,
      targetId,
      senderId: req.user._id,
      content,
      structuredContent,
      parentId,
      attachments,
      idempotencyKey,
    });

    // Broadcast in real-time via Socket.IO to room if not duplicate
    const io = getSocketIO();
    if (io && !isDuplicate) {
      const room = conversationType === 'channel' ? `channel:${targetId}` : `conv:${targetId}`;
      io.to(room).emit('new_message', message);

      if (parentId) {
        io.to(`thread:${parentId}`).emit('thread_reply', message);
      }
    }

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      data: { message, isDuplicate },
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = 40, direction = 'older' } = req.query;

    const result = await messageService.getMessages({
      targetId: channelId,
      cursor,
      limit: parseInt(limit, 10),
      direction,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { cursor, limit = 40, direction = 'older' } = req.query;

    const result = await messageService.getMessages({
      targetId: conversationId,
      cursor,
      limit: parseInt(limit, 10),
      direction,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getThread = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { cursor, limit = 50 } = req.query;

    const parentMessage = await Message.findById(messageId)
      .populate('senderId', 'displayName realName avatarUrl title')
      .populate('reactions.users', 'displayName avatarUrl')
      .populate('mentions', 'displayName');

    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        message: 'Parent message not found',
      });
    }

    const repliesResult = await messageService.getThreadReplies({
      parentId: messageId,
      cursor,
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: {
        parentMessage,
        ...repliesResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const updatedMessage = await messageService.toggleReaction({
      messageId,
      userId: req.user._id,
      emoji,
    });

    const io = getSocketIO();
    if (io) {
      const room =
        updatedMessage.conversationType === 'channel'
          ? `channel:${updatedMessage.targetId}`
          : `conv:${updatedMessage.targetId}`;

      io.to(room).emit('reaction_updated', {
        messageId: updatedMessage._id,
        reactions: updatedMessage.reactions,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        messageId: updatedMessage._id,
        reactions: updatedMessage.reactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const updated = await messageService.editMessage({
      messageId,
      userId: req.user._id,
      content,
    });

    const io = getSocketIO();
    if (io) {
      const room =
        updated.conversationType === 'channel'
          ? `channel:${updated.targetId}`
          : `conv:${updated.targetId}`;

      io.to(room).emit('message_edited', updated);
    }

    res.status(200).json({
      success: true,
      data: { message: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const isWsAdmin = ['owner', 'admin'].includes(req.workspaceMember?.role);

    const deleted = await messageService.deleteMessage({
      messageId,
      userId: req.user._id,
      isWsAdmin,
    });

    const io = getSocketIO();
    if (io) {
      const room =
        deleted.conversationType === 'channel'
          ? `channel:${deleted.targetId}`
          : `conv:${deleted.targetId}`;

      io.to(room).emit('message_deleted', {
        messageId: deleted._id,
        targetId: deleted.targetId,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted',
      data: { messageId: deleted._id },
    });
  } catch (error) {
    next(error);
  }
};

export const togglePin = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const updated = await messageService.togglePin({
      messageId,
      userId: req.user._id,
    });

    const io = getSocketIO();
    if (io) {
      const room =
        updated.conversationType === 'channel'
          ? `channel:${updated.targetId}`
          : `conv:${updated.targetId}`;

      io.to(room).emit('message_pinned', {
        messageId: updated._id,
        isPinned: updated.isPinned,
        pinnedAt: updated.pinnedAt,
        pinnedBy: updated.pinnedBy,
      });
    }

    res.status(200).json({
      success: true,
      data: { message: updated },
    });
  } catch (error) {
    next(error);
  }
};
