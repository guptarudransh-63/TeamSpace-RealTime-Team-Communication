import * as notificationService from '../services/notificationService.js';
import { NotificationPreference } from '../models/NotificationPreference.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { workspaceId, page = 1, limit = 30 } = req.query;

    const result = await notificationService.getUserNotifications({
      userId: req.user._id,
      workspaceId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    const notification = await notificationService.markNotificationAsRead({
      notificationId,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const { workspaceId } = req.body;

    await notificationService.markAllNotificationsAsRead({
      userId: req.user._id,
      workspaceId,
    });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const getPreferences = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const preferences = await NotificationPreference.find({
      userId: req.user._id,
      workspaceId,
    });

    res.status(200).json({
      success: true,
      data: { preferences },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreference = async (req, res, next) => {
  try {
    const { workspaceId, targetId, level } = req.body;

    const pref = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id, workspaceId, targetId: targetId || null },
      { $set: { level } },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: { preference: pref },
    });
  } catch (error) {
    next(error);
  }
};
