import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { User } from '../models/User.js';
import { ReadState } from '../models/ReadState.js';
import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { extractMentionHandles } from '../utils/sanitize.js';

export const createMessage = async ({
  workspaceId,
  conversationType,
  targetId,
  senderId,
  content,
  structuredContent,
  parentId = null,
  attachments = [],
  idempotencyKey = null,
}) => {
  // 1. Idempotency Check: if idempotencyKey is supplied, return existing message if found
  if (idempotencyKey) {
    const existing = await Message.findOne({ idempotencyKey })
      .populate('senderId', 'displayName realName avatarUrl')
      .populate('reactions.users', 'displayName avatarUrl');
    if (existing) {
      return { message: existing, isDuplicate: true };
    }
  }

  // 2. Validate Parent Message if replying in thread
  let parentMessage = null;
  if (parentId) {
    parentMessage = await Message.findById(parentId);
    if (!parentMessage) {
      throw new Error('Parent message not found');
    }
    if (parentMessage.targetId.toString() !== targetId.toString()) {
      throw new Error('Parent message belongs to a different conversation');
    }
  }

  // 3. Resolve Mentions from text (@handle)
  const handles = extractMentionHandles(content);
  let mentionUserIds = [];
  if (handles.length > 0) {
    // Find workspace members matching displayNames (case-insensitive)
    const users = await User.find({
      displayName: { $in: handles.map((h) => new RegExp(`^${h}$`, 'i')) },
    }).select('_id');

    if (users.length > 0) {
      // Verify they belong to this workspace
      const validMembers = await WorkspaceMember.find({
        workspaceId,
        userId: { $in: users.map((u) => u._id) },
      }).select('userId');

      mentionUserIds = validMembers.map((m) => m.userId);
    }
  }

  // 4. Create and Persist Message
  const message = await Message.create({
    workspaceId,
    conversationType,
    targetId,
    senderId,
    content,
    structuredContent,
    parentId,
    attachments,
    mentions: mentionUserIds,
    idempotencyKey,
  });

  // 5. Update parent message reply count and timestamp if thread reply
  if (parentId) {
    await Message.findByIdAndUpdate(parentId, {
      $inc: { replyCount: 1 },
      $set: { lastReplyAt: message.createdAt },
    });
  }

  // 6. If Direct Conversation, update lastMessageAt
  if (conversationType === 'conversation') {
    await Conversation.findByIdAndUpdate(targetId, {
      lastMessageAt: message.createdAt,
    });
  }

  // 7. Auto-mark message as read for the sender
  await ReadState.findOneAndUpdate(
    { userId: senderId, targetId },
    {
      $set: {
        workspaceId,
        conversationType,
        lastReadMessageId: message._id,
        lastReadTimestamp: message.createdAt,
      },
    },
    { upsert: true, new: true }
  );

  // 8. Generate Notifications for Mentions and Thread Parent Author
  try {
    const sender = await User.findById(senderId).select('displayName');
    const senderName = sender?.displayName || 'Someone';

    // Mentions
    for (const mentionedId of mentionUserIds) {
      if (mentionedId.toString() !== senderId.toString()) {
        const pref = await NotificationPreference.findOne({
          userId: mentionedId,
          workspaceId,
          targetId,
        });

        if (!pref || pref.level !== 'muted') {
          await Notification.create({
            userId: mentionedId,
            workspaceId,
            actorId: senderId,
            type: 'mention',
            title: `${senderName} mentioned you`,
            body: content.slice(0, 120),
            link: `/${workspaceId}/${conversationType}/${targetId}`,
          });
        }
      }
    }

    // Thread Reply Notification for parent author
    if (parentMessage && parentMessage.senderId.toString() !== senderId.toString()) {
      await Notification.create({
        userId: parentMessage.senderId,
        workspaceId,
        actorId: senderId,
        type: 'thread_reply',
        title: `${senderName} replied to your thread`,
        body: content.slice(0, 120),
        link: `/${workspaceId}/${conversationType}/${targetId}?thread=${parentId}`,
      });
    }
  } catch (err) {
    console.error('[Notification Generation Error]', err.message);
  }

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'displayName realName avatarUrl title')
    .populate('reactions.users', 'displayName avatarUrl')
    .populate('mentions', 'displayName');

  return { message: populatedMessage, isDuplicate: false };
};

export const getMessages = async ({
  targetId,
  cursor = null,
  limit = 40,
  direction = 'older',
}) => {
  const query = {
    targetId,
    parentId: null, // Only fetch top-level timeline messages
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      if (direction === 'older') {
        query.$or = [
          { createdAt: { $lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
        ];
      } else {
        query.$or = [
          { createdAt: { $gt: decoded.createdAt } },
          { createdAt: decoded.createdAt, _id: { $gt: decoded.id } },
        ];
      }
    }
  }

  const sortOrder = direction === 'older' ? { createdAt: -1, _id: -1 } : { createdAt: 1, _id: 1 };

  const rawMessages = await Message.find(query)
    .sort(sortOrder)
    .limit(limit + 1)
    .populate('senderId', 'displayName realName avatarUrl title')
    .populate('reactions.users', 'displayName avatarUrl')
    .populate('mentions', 'displayName');

  const hasMore = rawMessages.length > limit;
  const messagesSlice = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Always return in chronological order (oldest to newest) for timeline display
  const messages = direction === 'older' ? messagesSlice.reverse() : messagesSlice;

  let nextCursor = null;
  if (hasMore && messagesSlice.length > 0) {
    const edge = direction === 'older' ? messagesSlice[0] : messagesSlice[messagesSlice.length - 1];
    nextCursor = encodeCursor(edge.createdAt, edge._id);
  }

  return {
    messages,
    nextCursor,
    hasMore,
  };
};

export const getThreadReplies = async ({ parentId, cursor = null, limit = 50 }) => {
  const query = { parentId };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query.$or = [
        { createdAt: { $gt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $gt: decoded.id } },
      ];
    }
  }

  const rawMessages = await Message.find(query)
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit + 1)
    .populate('senderId', 'displayName realName avatarUrl title')
    .populate('reactions.users', 'displayName avatarUrl')
    .populate('mentions', 'displayName');

  const hasMore = rawMessages.length > limit;
  const messages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  let nextCursor = null;
  if (hasMore && messages.length > 0) {
    const lastItem = messages[messages.length - 1];
    nextCursor = encodeCursor(lastItem.createdAt, lastItem._id);
  }

  return {
    messages,
    nextCursor,
    hasMore,
  };
};

export const toggleReaction = async ({ messageId, userId, emoji }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

  if (reactionIndex > -1) {
    const userIndex = message.reactions[reactionIndex].users.findIndex(
      (u) => u.toString() === userId.toString()
    );

    if (userIndex > -1) {
      // Remove reaction
      message.reactions[reactionIndex].users.splice(userIndex, 1);
      if (message.reactions[reactionIndex].users.length === 0) {
        message.reactions.splice(reactionIndex, 1);
      }
    } else {
      // Add user to existing emoji
      message.reactions[reactionIndex].users.push(userId);
    }
  } else {
    // New emoji reaction
    message.reactions.push({
      emoji,
      users: [userId],
    });
  }

  await message.save();

  return Message.findById(messageId)
    .populate('senderId', 'displayName realName avatarUrl')
    .populate('reactions.users', 'displayName avatarUrl');
};

export const editMessage = async ({ messageId, userId, content }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('Unauthorized to edit this message');
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return Message.findById(messageId)
    .populate('senderId', 'displayName realName avatarUrl title')
    .populate('reactions.users', 'displayName avatarUrl');
};

export const deleteMessage = async ({ messageId, userId, isWsAdmin = false }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId.toString() !== userId.toString() && !isWsAdmin) {
    throw new Error('Unauthorized to delete this message');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message was deleted';
  message.attachments = [];
  await message.save();

  return message;
};

export const togglePin = async ({ messageId, userId }) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  message.isPinned = !message.isPinned;
  message.pinnedAt = message.isPinned ? new Date() : null;
  message.pinnedBy = message.isPinned ? userId : null;
  await message.save();

  return Message.findById(messageId)
    .populate('senderId', 'displayName realName avatarUrl')
    .populate('pinnedBy', 'displayName avatarUrl');
};
