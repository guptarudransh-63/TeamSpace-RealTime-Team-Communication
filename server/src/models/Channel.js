import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      lowercase: true,
      maxlength: [80, 'Channel name cannot exceed 80 characters'],
      match: [/^[a-z0-9_-]+$/, 'Channel name may only contain lowercase letters, numbers, hyphens, and underscores'],
    },
    topic: {
      type: String,
      trim: true,
      default: '',
      maxlength: [250, 'Topic cannot exceed 250 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
channelSchema.index({ workspaceId: 1, isPrivate: 1 });

export const Channel = mongoose.model('Channel', channelSchema);
