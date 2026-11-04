import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Invitation } from '../models/Invitation.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;

    // Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) baseSlug = 'workspace';

    let slug = baseSlug;
    let count = 1;
    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const workspace = await Workspace.create({
      name,
      slug,
      description,
      ownerId: req.user._id,
    });

    // Create owner membership
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'owner',
    });

    // Create default channels: #general and #random
    const generalChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'general',
      topic: 'Company-wide announcements and work-based matters',
      description: 'This is the one channel that will always include everyone.',
      isPrivate: false,
      createdBy: req.user._id,
    });

    const randomChannel = await Channel.create({
      workspaceId: workspace._id,
      name: 'random',
      topic: 'Non-work banter and water cooler chat',
      description: 'A place for non-work-related flimflam, faffing, and fun.',
      isPrivate: false,
      createdBy: req.user._id,
    });

    // Add owner to both default channels
    await ChannelMember.insertMany([
      { channelId: generalChannel._id, userId: req.user._id, role: 'admin' },
      { channelId: randomChannel._id, userId: req.user._id, role: 'admin' },
    ]);

    // Set default channel
    workspace.settings.defaultChannelId = generalChannel._id;
    await workspace.save();

    await AuditLog.create({
      workspaceId: workspace._id,
      actorId: req.user._id,
      action: 'WORKSPACE_CREATED',
      targetType: 'Workspace',
      targetId: workspace._id,
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: {
        workspace,
        defaultChannel: generalChannel,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        workspace,
        role: req.workspaceMember?.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const memberships = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'displayName realName email avatarUrl title presence status lastActiveAt')
      .sort({ role: 1, createdAt: 1 });

    const members = memberships
      .filter((m) => m.userId)
      .map((m) => ({
        ...m.userId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        members,
        count: members.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, avatarUrl, settings } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (settings) updateData.settings = settings;

    const updated = await Workspace.findByIdAndUpdate(
      workspaceId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Workspace updated',
      data: { workspace: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { email, role = 'member' } = req.body;

    // Check if user already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId: existingUser._id,
      });

      if (isMember) {
        return res.status(409).json({
          success: false,
          message: 'User is already a member of this workspace',
        });
      }
    }

    // Check for existing pending invite
    let invitation = await Invitation.findOne({
      workspaceId,
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      invitation = await Invitation.create({
        workspaceId,
        inviterId: req.user._id,
        email,
        role,
      });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteLink = `${clientUrl}/join/${invitation.token}`;

    res.status(200).json({
      success: true,
      message: 'Invitation generated successfully',
      data: {
        invitation,
        inviteLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token',
      });
    }

    // Check if already in workspace
    const existing = await WorkspaceMember.findOne({
      workspaceId: invitation.workspaceId,
      userId: req.user._id,
    });

    if (existing) {
      invitation.status = 'accepted';
      await invitation.save();
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this workspace',
        data: { workspaceId: invitation.workspaceId },
      });
    }

    await WorkspaceMember.create({
      workspaceId: invitation.workspaceId,
      userId: req.user._id,
      role: invitation.role,
    });

    invitation.status = 'accepted';
    await invitation.save();

    // Auto-join default channel if set
    const workspace = await Workspace.findById(invitation.workspaceId);
    if (workspace?.settings?.defaultChannelId) {
      await ChannelMember.findOneAndUpdate(
        { channelId: workspace.settings.defaultChannelId, userId: req.user._id },
        { role: 'member' },
        { upsert: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Joined workspace successfully',
      data: {
        workspaceId: invitation.workspaceId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { workspaceId, memberUserId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member', 'guest'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
      });
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: memberUserId,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this workspace',
      });
    }

    if (membership.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change the role of the workspace owner',
      });
    }

    membership.role = role;
    await membership.save();

    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: { membership },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const { workspaceId, memberUserId } = req.params;

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: memberUserId,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    if (membership.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove the workspace owner',
      });
    }

    await WorkspaceMember.deleteOne({ _id: membership._id });

    // Remove from channel memberships in this workspace
    const channels = await Channel.find({ workspaceId }).select('_id');
    const channelIds = channels.map((c) => c._id);
    await ChannelMember.deleteMany({
      channelId: { $in: channelIds },
      userId: memberUserId,
    });

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace',
    });
  } catch (error) {
    next(error);
  }
};
