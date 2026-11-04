import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    type: {
      type: String,
      enum: ['direct', 'group_direct'],
      default: 'direct',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // Deterministic canonical hash of sorted participant IDs in workspace for 1:1 uniqueness
    canonicalHash: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ workspaceId: 1, canonicalHash: 1 }, { unique: true, sparse: true });
conversationSchema.index({ workspaceId: 1, participants: 1 });
conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
