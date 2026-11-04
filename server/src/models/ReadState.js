import mongoose from 'mongoose';

const readStateSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    conversationType: {
      type: String,
      enum: ['channel', 'conversation'],
      required: true,
    },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastReadTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

readStateSchema.index({ userId: 1, targetId: 1 }, { unique: true });
readStateSchema.index({ userId: 1, workspaceId: 1 });

export const ReadState = mongoose.model('ReadState', readStateSchema);
