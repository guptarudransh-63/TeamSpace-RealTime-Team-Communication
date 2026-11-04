import { create } from 'zustand';
import { api } from '../api/client.js';

export const useUnreadStore = create((set, get) => ({
  unreadByTarget: {},
  totalUnread: 0,

  fetchUnreads: async (workspaceId) => {
    if (!workspaceId) return;
    try {
      const res = await api.get(`/unread/workspace/${workspaceId}`);
      set({
        unreadByTarget: res.data.unreadByTarget || {},
        totalUnread: res.data.totalUnread || 0,
      });
    } catch (err) {
      console.error('[Fetch Unreads Error]', err);
    }
  },

  markAsRead: async (workspaceId, targetId, conversationType, messageId = null) => {
    if (!workspaceId || !targetId) return;

    // Optimistically clear unread count for target
    set((state) => {
      const currentCount = state.unreadByTarget[targetId] || 0;
      const updated = { ...state.unreadByTarget };
      delete updated[targetId];

      return {
        unreadByTarget: updated,
        totalUnread: Math.max(0, state.totalUnread - currentCount),
      };
    });

    try {
      await api.post('/unread/read', {
        workspaceId,
        targetId,
        conversationType,
        messageId,
      });
    } catch (err) {
      console.error('[Mark As Read Error]', err);
    }
  },

  // Called when incoming message arrives
  incrementUnread: (targetId, currentActiveTargetId) => {
    // If user is currently looking at this channel, don't increment unread
    if (targetId === currentActiveTargetId) return;

    set((state) => {
      const count = (state.unreadByTarget[targetId] || 0) + 1;
      return {
        unreadByTarget: {
          ...state.unreadByTarget,
          [targetId]: count,
        },
        totalUnread: state.totalUnread + 1,
      };
    });
  },

  // Called when read state sync received from another tab
  syncFromSocket: (targetId) => {
    set((state) => {
      const currentCount = state.unreadByTarget[targetId] || 0;
      const updated = { ...state.unreadByTarget };
      delete updated[targetId];

      return {
        unreadByTarget: updated,
        totalUnread: Math.max(0, state.totalUnread - currentCount),
      };
    });
  },
}));
