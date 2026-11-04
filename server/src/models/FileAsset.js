import mongoose from 'mongoose';

const fileAssetSchema = new mongoose.Schema(
  {
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
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

fileAssetSchema.index({ workspaceId: 1, targetId: 1 });
fileAssetSchema.index({ uploaderId: 1 });

export const FileAsset = mongoose.model('FileAsset', fileAssetSchema);
