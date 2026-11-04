import { Conversation } from '../models/Conversation.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Message } from '../models/Message.js';

export const getOrCreateDirectConversation = async (req, res, next) => {
  try {
    const { workspaceId, recipientId } = req.body;
    const currentUserId = req.user._id.toString();

    if (recipientId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a direct message with yourself',
      });
    }

    // Verify recipient is a member of the workspace
    const recipientMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: recipientId,
    });

    if (!recipientMembership) {
      return res.status(404).json({
        success: false,
        message: 'Recipient is not a member of this workspace',
      });
    }

    // Create deterministic canonical hash
    const sortedIds = [currentUserId, recipientId.toString()].sort();
    const canonicalHash = sortedIds.join(':');

    let conversation = await Conversation.findOne({
      workspaceId,
      canonicalHash,
    }).populate('participants', 'displayName realName avatarUrl title presence status lastActiveAt');

    if (!conversation) {
      conversation = await Conversation.create({
        workspaceId,
        type: 'direct',
        participants: sortedIds,
        canonicalHash,
      });

      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'displayName realName avatarUrl title presence status lastActiveAt'
      );
    }

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
};

export const createGroupDirectConversation = async (req, res, next) => {
  try {
    const { workspaceId, recipientIds, title = '' } = req.body;
    const currentUserId = req.user._id.toString();

    const uniqueParticipants = Array.from(new Set([currentUserId, ...recipientIds]));

    if (uniqueParticipants.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Group direct message requires at least 3 participants',
      });
    }

    // Verify all participants are in the workspace
    const validMemberships = await WorkspaceMember.find({
      workspaceId,
      userId: { $in: uniqueParticipants },
    });

    if (validMemberships.length !== uniqueParticipants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants are not members of this workspace',
      });
    }

    const conversation = await Conversation.create({
      workspaceId,
      type: 'group_direct',
      participants: uniqueParticipants,
      title,
    });

    const populated = await Conversation.findById(conversation._id).populate(
      'participants',
      'displayName realName avatarUrl title presence status'
    );

    res.status(201).json({
      success: true,
      message: 'Group direct message created',
      data: { conversation: populated },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserConversations = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const conversations = await Conversation.find({
      workspaceId,
      participants: req.user._id,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'displayName realName avatarUrl title presence status lastActiveAt');

    res.status(200).json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
};
