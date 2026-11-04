import { Message } from '../models/Message.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Conversation } from '../models/Conversation.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';

export const searchWorkspace = async (req, res, next) => {
  try {
    const {
      workspaceId,
      q = '',
      channelId,
      senderId,
      startDate,
      endDate,
      limit = 20,
      page = 1,
    } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'workspaceId is required',
      });
    }

    // 1. Verify workspace membership
    const wsMember = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id,
    });

    if (!wsMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this workspace',
      });
    }

    // 2. Discover all targets accessible by current user
    const publicChannels = await Channel.find({
      workspaceId,
      isPrivate: false,
    }).select('_id name');

    let accessibleChannelIds = publicChannels.map((c) => c._id.toString());
    const channelMap = new Map();
    publicChannels.forEach((c) => channelMap.set(c._id.toString(), { name: c.name, isPrivate: false }));

    const isWsAdmin = ['owner', 'admin'].includes(wsMember.role);
    let privateChannels = [];

    if (isWsAdmin) {
      privateChannels = await Channel.find({ workspaceId, isPrivate: true }).select('_id name');
    } else {
      const privateMemberships = await ChannelMember.find({ userId: req.user._id }).select('channelId');
      const pChanIds = privateMemberships.map((m) => m.channelId);
      privateChannels = await Channel.find({
        workspaceId,
        _id: { $in: pChanIds },
        isPrivate: true,
      }).select('_id name');
    }

    privateChannels.forEach((c) => {
      accessibleChannelIds.push(c._id.toString());
      channelMap.set(c._id.toString(), { name: c.name, isPrivate: true });
    });

    // Also get conversations
    const conversations = await Conversation.find({
      workspaceId,
      participants: req.user._id,
    })
      .select('_id type participants')
      .populate('participants', 'displayName');

    const accessibleConvIds = conversations.map((c) => c._id.toString());
    const convMap = new Map();
    conversations.forEach((c) => {
      const otherNames = c.participants
        .filter((p) => p._id.toString() !== req.user._id.toString())
        .map((p) => p.displayName)
        .join(', ');
      convMap.set(c._id.toString(), { name: otherNames || 'Direct Message', type: c.type });
    });

    const allAccessibleTargetIds = [...accessibleChannelIds, ...accessibleConvIds];

    // 3. Build search query
    const searchQuery = {
      workspaceId,
      isDeleted: false,
    };

    if (channelId) {
      // If user specified channelId, verify it's accessible
      if (!allAccessibleTargetIds.includes(channelId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to the specified channel',
        });
      }
      searchQuery.targetId = channelId;
    } else {
      searchQuery.targetId = { $in: allAccessibleTargetIds };
    }

    if (senderId) {
      searchQuery.senderId = senderId;
    }

    if (q.trim()) {
      // Use regex case-insensitive search for flexible match
      searchQuery.content = { $regex: q.trim(), $options: 'i' };
    }

    if (startDate || endDate) {
      searchQuery.createdAt = {};
      if (startDate) searchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) searchQuery.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [messages, total] = await Promise.all([
      Message.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('senderId', 'displayName realName avatarUrl title')
        .populate('reactions.users', 'displayName'),
      Message.countDocuments(searchQuery),
    ]);

    const enrichedResults = messages.map((msg) => {
      const targetIdStr = msg.targetId.toString();
      const channelInfo = channelMap.get(targetIdStr);
      const convInfo = convMap.get(targetIdStr);

      return {
        ...msg.toObject(),
        location: channelInfo
          ? { type: 'channel', name: `#${channelInfo.name}`, isPrivate: channelInfo.isPrivate }
          : convInfo
          ? { type: 'conversation', name: convInfo.name }
          : { type: 'unknown', name: 'Unknown' },
      };
    });

    res.status(200).json({
      success: true,
      data: {
        results: enrichedResults,
        total,
        page: parseInt(page, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};
