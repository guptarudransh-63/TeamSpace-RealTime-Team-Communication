import { ReadState } from '../models/ReadState.js';
import { Message } from '../models/Message.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Conversation } from '../models/Conversation.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';

export const markAsRead = async ({
  userId,
  workspaceId,
  targetId,
  conversationType,
  messageId = null,
}) => {
  const readTimestamp = new Date();

  const readState = await ReadState.findOneAndUpdate(
    { userId, targetId },
    {
      $set: {
        workspaceId,
        conversationType,
        ...(messageId && { lastReadMessageId: messageId }),
        lastReadTimestamp: readTimestamp,
      },
    },
    { upsert: true, new: true }
  );

  return readState;
};

export const getUnreadCounts = async ({ userId, workspaceId }) => {
  // 1. Get user workspace membership
  const wsMember = await WorkspaceMember.findOne({ workspaceId, userId });
  if (!wsMember) {
    return { unreadByTarget: {}, totalUnread: 0 };
  }

  // 2. Find all accessible channels in this workspace:
  // Public channels
  const publicChannels = await Channel.find({
    workspaceId,
    isPrivate: false,
    isArchived: false,
  }).select('_id');

  // Private channels where user is a member
  const privateMemberships = await ChannelMember.find({ userId }).select('channelId');
  const privateChannelIds = privateMemberships.map((m) => m.channelId);

  const privateChannels = await Channel.find({
    _id: { $in: privateChannelIds },
    workspaceId,
    isPrivate: true,
    isArchived: false,
  }).select('_id');

  const channelIds = [
    ...publicChannels.map((c) => c._id),
    ...privateChannels.map((c) => c._id),
  ];

  // 3. Find all conversations (DMs) where user is participant in this workspace
  const conversations = await Conversation.find({
    workspaceId,
    participants: userId,
  }).select('_id');

  const conversationIds = conversations.map((c) => c._id);
  const allTargetIds = [...channelIds, ...conversationIds];

  // 4. Retrieve ReadStates for user for all targets
  const readStates = await ReadState.find({
    userId,
    targetId: { $in: allTargetIds },
  });

  const readStateMap = new Map();
  readStates.forEach((rs) => {
    readStateMap.set(rs.targetId.toString(), rs.lastReadTimestamp);
  });

  // Default past date for targets with no read state yet
  const defaultPastDate = new Date(0);

  // 5. Query unread count for each target
  const unreadByTarget = {};
  let totalUnread = 0;

  await Promise.all(
    allTargetIds.map(async (targetId) => {
      const idStr = targetId.toString();
      const lastRead = readStateMap.get(idStr) || defaultPastDate;

      const unreadCount = await Message.countDocuments({
        targetId,
        parentId: null,
        senderId: { $ne: userId },
        createdAt: { $gt: lastRead },
      });

      if (unreadCount > 0) {
        unreadByTarget[idStr] = unreadCount;
        totalUnread += unreadCount;
      }
    })
  );

  return {
    unreadByTarget,
    totalUnread,
  };
};
