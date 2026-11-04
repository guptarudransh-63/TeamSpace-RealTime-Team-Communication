import { Notification } from '../models/Notification.js';

export const createNotification = async ({
  userId,
  workspaceId,
  actorId,
  type,
  title,
  body,
  link,
}) => {
  return Notification.create({
    userId,
    workspaceId,
    actorId,
    type,
    title,
    body,
    link,
  });
};

export const getUserNotifications = async ({ userId, workspaceId, limit = 30, page = 1 }) => {
  const query = { userId };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'displayName avatarUrl'),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const markNotificationAsRead = async ({ notificationId, userId }) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
};

export const markAllNotificationsAsRead = async ({ userId, workspaceId }) => {
  const query = { userId };
  if (workspaceId) query.workspaceId = workspaceId;

  await Notification.updateMany(query, { $set: { isRead: true } });
  return { success: true };
};
