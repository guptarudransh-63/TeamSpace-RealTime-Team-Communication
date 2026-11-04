import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileAsset',
    },
    originalName: String,
    fileName: String,
    mimeType: String,
    size: Number,
    url: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    conversationType: {
      type: String,
      enum: ['channel', 'conversation'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
    },
    structuredContent: {
      type: mongoose.Schema.Types.Mixed,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    lastReplyAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    attachments: [attachmentSchema],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [reactionSchema],
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: Date,
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ targetId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ parentId: 1, createdAt: 1 });
messageSchema.index({ workspaceId: 1, targetId: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });

export const Message = mongoose.model('Message', messageSchema);
