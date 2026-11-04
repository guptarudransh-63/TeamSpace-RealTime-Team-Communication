import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // Channel or Conversation ID, or null for workspace-level default
      default: null,
    },
    level: {
      type: String,
      enum: ['all', 'mentions_only', 'dms_only', 'muted'],
      default: 'all',
    },
  },
  {
    timestamps: true,
  }
);

notificationPreferenceSchema.index({ userId: 1, workspaceId: 1, targetId: 1 }, { unique: true });

export const NotificationPreference = mongoose.model(
  'NotificationPreference',
  notificationPreferenceSchema
);
