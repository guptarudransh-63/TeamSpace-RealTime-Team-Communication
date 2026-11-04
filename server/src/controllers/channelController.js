import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

export const createChannel = async (req, res, next) => {
  try {
    const { workspaceId, name, topic = '', description = '', isPrivate = false } = req.body;

    const formattedName = name.toLowerCase().trim().replace(/\s+/g, '-');

    const existing = await Channel.findOne({ workspaceId, name: formattedName });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A channel named #${formattedName} already exists in this workspace.`,
      });
    }

    const channel = await Channel.create({
      workspaceId,
      name: formattedName,
      topic,
      description,
      isPrivate,
      createdBy: req.user._id,
    });

    // Add creator to ChannelMember as admin
    await ChannelMember.create({
      channelId: channel._id,
      userId: req.user._id,
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: { channel },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceChannels = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // 1. Get all public channels
    const publicChannels = await Channel.find({
      workspaceId,
      isPrivate: false,
    }).sort({ name: 1 });

    // 2. Get private channels where current user is a member or workspace admin/owner
    const isWsAdmin = ['owner', 'admin'].includes(req.workspaceMember?.role);

    let privateChannels = [];
    if (isWsAdmin) {
      privateChannels = await Channel.find({
        workspaceId,
        isPrivate: true,
      }).sort({ name: 1 });
    } else {
      const myPrivateMemberships = await ChannelMember.find({ userId: req.user._id }).select('channelId');
      const channelIds = myPrivateMemberships.map((m) => m.channelId);

      privateChannels = await Channel.find({
        workspaceId,
        _id: { $in: channelIds },
        isPrivate: true,
      }).sort({ name: 1 });
    }

    const allChannels = [...publicChannels, ...privateChannels].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.status(200).json({
      success: true,
      data: { channels: allChannels },
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelDetails = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = req.channel || (await Channel.findById(channelId));

    const memberCount = await ChannelMember.countDocuments({ channelId });
    const isMember = !!(await ChannelMember.findOne({ channelId, userId: req.user._id }));

    res.status(200).json({
      success: true,
      data: {
        channel,
        memberCount,
        isMember,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getChannelMembers = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const memberships = await ChannelMember.find({ channelId })
      .populate('userId', 'displayName realName avatarUrl title presence status')
      .sort({ role: 1, createdAt: 1 });

    const members = memberships
      .filter((m) => m.userId)
      .map((m) => ({
        ...m.userId.toObject(),
        channelRole: m.role,
        joinedAt: m.joinedAt,
      }));

    res.status(200).json({
      success: true,
      data: { members, count: members.length },
    });
  } catch (error) {
    next(error);
  }
};

export const joinChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Cannot join a private channel without an invitation',
      });
    }

    await ChannelMember.findOneAndUpdate(
      { channelId, userId: req.user._id },
      { role: 'member', joinedAt: new Date() },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Joined channel successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const leaveChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    // Check if channel is default
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }

    if (channel.name === 'general') {
      return res.status(400).json({
        success: false,
        message: 'Members cannot leave the #general channel',
      });
    }

    await ChannelMember.deleteOne({ channelId, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Left channel successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const inviteToChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { userIds } = req.body;

    const channel = req.channel;

    // Verify target users are members of workspace
    const wsMembers = await WorkspaceMember.find({
      workspaceId: channel.workspaceId,
      userId: { $in: userIds },
    });

    const validUserIds = wsMembers.map((m) => m.userId);

    const operations = validUserIds.map((userId) => ({
      updateOne: {
        filter: { channelId, userId },
        update: { $setOnInsert: { role: 'member', joinedAt: new Date() } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await ChannelMember.bulkWrite(operations);
    }

    res.status(200).json({
      success: true,
      message: `Added ${validUserIds.length} members to #${channel.name}`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const { topic, description, name } = req.body;

    const updateFields = {};
    if (topic !== undefined) updateFields.topic = topic;
    if (description !== undefined) updateFields.description = description;
    if (name) updateFields.name = name.toLowerCase().trim().replace(/\s+/g, '-');

    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Channel updated',
      data: { channel: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const channel = await Channel.findById(channelId);

    if (channel.name === 'general') {
      return res.status(400).json({
        success: false,
        message: 'The #general channel cannot be archived',
      });
    }

    channel.isArchived = true;
    await channel.save();

    res.status(200).json({
      success: true,
      message: 'Channel archived',
      data: { channel },
    });
  } catch (error) {
    next(error);
  }
};

export const getPinnedMessages = async (req, res, next) => {
  try {
    const { channelId } = req.params;

    const pinnedMessages = await Message.find({
      targetId: channelId,
      isPinned: true,
      isDeleted: false,
    })
      .sort({ pinnedAt: -1 })
      .populate('senderId', 'displayName realName avatarUrl title')
      .populate('pinnedBy', 'displayName');

    res.status(200).json({
      success: true,
      data: { messages: pinnedMessages },
    });
  } catch (error) {
    next(error);
  }
};
