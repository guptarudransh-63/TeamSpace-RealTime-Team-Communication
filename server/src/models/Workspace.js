import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [80, 'Workspace name cannot exceed 80 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      defaultChannelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
      },
    },
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({ ownerId: 1 });

export const Workspace = mongoose.model('Workspace', workspaceSchema);
