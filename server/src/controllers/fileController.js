import path from 'path';
import fs from 'fs';
import { FileAsset } from '../models/FileAsset.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { Channel } from '../models/Channel.js';
import { ChannelMember } from '../models/ChannelMember.js';
import { Conversation } from '../models/Conversation.js';

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { workspaceId, targetId, conversationType } = req.body;

    if (!workspaceId || !targetId || !conversationType) {
      // Remove temporary uploaded file if metadata missing
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'workspaceId, targetId, and conversationType are required',
      });
    }

    const fileAsset = await FileAsset.create({
      workspaceId,
      targetId,
      conversationType,
      uploaderId: req.user._id,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });

    const fileUrl = `/api/v1/files/${fileAsset._id}/download`;

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: {
          fileAssetId: fileAsset._id,
          originalName: fileAsset.originalName,
          fileName: fileAsset.fileName,
          mimeType: fileAsset.mimeType,
          size: fileAsset.size,
          url: fileUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const fileAsset = await FileAsset.findById(fileId);
    if (!fileAsset) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // 1. Verify workspace membership
    const wsMember = await WorkspaceMember.findOne({
      workspaceId: fileAsset.workspaceId,
      userId: req.user._id,
    });

    if (!wsMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not belong to this workspace.',
      });
    }

    // 2. Verify target conversation/channel access
    if (fileAsset.conversationType === 'channel') {
      const channel = await Channel.findById(fileAsset.targetId);
      if (channel && channel.isPrivate) {
        const isChanMember = await ChannelMember.findOne({
          channelId: fileAsset.targetId,
          userId: req.user._id,
        });
        const isWsAdmin = ['owner', 'admin'].includes(wsMember.role);
        if (!isChanMember && !isWsAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have access to this channel file.',
          });
        }
      }
    } else if (fileAsset.conversationType === 'conversation') {
      const conversation = await Conversation.findById(fileAsset.targetId);
      if (conversation) {
        const isParticipant = conversation.participants.some(
          (p) => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have access to this direct message file.',
          });
        }
      }
    }

    if (!fs.existsSync(fileAsset.path)) {
      return res.status(404).json({
        success: false,
        message: 'File content does not exist on disk',
      });
    }

    res.setHeader('Content-Type', fileAsset.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileAsset.originalName)}"`
    );

    const stream = fs.createReadStream(fileAsset.path);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
