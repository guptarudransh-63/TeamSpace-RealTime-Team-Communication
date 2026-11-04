import * as unreadService from '../services/unreadService.js';
import { getSocketIO } from '../socket/socket.js';

export const getWorkspaceUnreads = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const data = await unreadService.getUnreadCounts({
      userId: req.user._id,
      workspaceId,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const markTargetAsRead = async (req, res, next) => {
  try {
    const { workspaceId, targetId, conversationType, messageId } = req.body;

    const readState = await unreadService.markAsRead({
      userId: req.user._id,
      workspaceId,
      targetId,
      conversationType,
      messageId,
    });

    // Notify user's other browser tabs / devices via socket
    const io = getSocketIO();
    if (io) {
      io.to(`user:${req.user._id}`).emit('read_state_synced', {
        targetId,
        lastReadTimestamp: readState.lastReadTimestamp,
      });
    }

    res.status(200).json({
      success: true,
      data: { readState },
    });
  } catch (error) {
    next(error);
  }
};
