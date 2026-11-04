import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Conversation } from '../models/Conversation.js';

/**
 * Middleware ensuring current user is an active member of the workspace
 * Optionally checks if user's role is within allowedRoles (e.g. ['owner', 'admin'])
 */
export const requireWorkspaceMember = (allowedRoles = null) => {
  return async (req, res, next) => {
    try {
      const workspaceId =
        req.params.workspaceId ||
        req.body.workspaceId ||
        req.query.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Workspace ID is required.',
        });
      }

      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: req.user._id,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this workspace.',
        });
      }

      if (allowedRoles && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
        });
      }

      req.workspaceMember = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware ensuring current user can access a channel.
 * Public channels: allowed for any member of the channel's workspace.
 * Private channels: user must be in ChannelMember or a workspace owner/admin.
 */
export const requireChannelAccess = (options = { requireWrite: false }) => {
  return async (req, res, next) => {
    try {
      const channelId = req.params.channelId || req.body.channelId || req.query.channelId;

      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID is required.',
        });
      }

      const channel = await Channel.findById(channelId);
      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Channel not found.',
        });
      }

      // Check workspace membership
      const wsMembership = await WorkspaceMember.findOne({
        workspaceId: channel.workspaceId,
        userId: req.user._id,
      });

      if (!wsMembership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of the channel workspace.',
        });
      }

      if (channel.isArchived && options.requireWrite) {
        return res.status(403).json({
          success: false,
          message: 'This channel is archived. Posting or modifying messages is disabled.',
        });
      }

      // If channel is private, verify user is explicitly a member or workspace admin/owner
      if (channel.isPrivate) {
        const isChannelMember = await ChannelMember.findOne({
          channelId,
          userId: req.user._id,
        });

        const isWsAdmin = ['owner', 'admin'].includes(wsMembership.role);

        if (!isChannelMember && !isWsAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. This is a private channel and you are not a member.',
          });
        }
      }

      req.channel = channel;
      req.workspaceMember = wsMembership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware ensuring current user is a participant in the direct conversation
 */
export const requireConversationParticipant = async (req, res, next) => {
  try {
    const conversationId =
      req.params.conversationId ||
      req.body.conversationId ||
      req.query.conversationId;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required.',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.',
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a participant in this conversation.',
      });
    }

    req.conversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
};
