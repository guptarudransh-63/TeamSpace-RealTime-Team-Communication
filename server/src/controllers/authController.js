import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Invitation } from '../models/Invitation.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/token.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, displayName, inviteToken } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const user = await User.create({
      email,
      password,
      displayName,
      presence: 'online',
      lastActiveAt: new Date(),
    });

    // Check if registering via invitation token
    if (inviteToken) {
      const invite = await Invitation.findOne({
        token: inviteToken,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      });

      if (invite) {
        await WorkspaceMember.create({
          workspaceId: invite.workspaceId,
          userId: user._id,
          role: invite.role,
        });

        invite.status = 'accepted';
        await invite.save();
      }
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    user.presence = 'online';
    user.lastActiveAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        presence: 'offline',
        lastActiveAt: new Date(),
      });
    }

    clearTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Get user's workspaces
    const memberships = await WorkspaceMember.find({ userId: req.user._id })
      .populate('workspaceId', 'name slug description avatarUrl')
      .sort({ createdAt: 1 });

    const workspaces = memberships
      .filter((m) => m.workspaceId) // filter out deleted workspaces
      .map((m) => ({
        ...m.workspaceId.toObject(),
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON(),
        workspaces,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { displayName, realName, title, avatarUrl } = req.body;

    const updateFields = {};
    if (displayName !== undefined) updateFields.displayName = displayName;
    if (realName !== undefined) updateFields.realName = realName;
    if (title !== undefined) updateFields.title = title;
    if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { text, emoji, clearAt } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          status: {
            text: text || '',
            emoji: emoji || '',
            clearAt: clearAt ? new Date(clearAt) : null,
          },
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      data: {
        status: updatedUser.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePresence = async (req, res, next) => {
  try {
    const { presence } = req.body;

    if (!['online', 'away', 'offline'].includes(presence)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid presence value',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          presence,
          lastActiveAt: new Date(),
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        presence: updatedUser.presence,
      },
    });
  } catch (error) {
    next(error);
  }
};
