import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Modals
  searchModalOpen: false,
  createChannelModalOpen: false,
  inviteModalOpen: false,
  profileModalOpen: false,
  channelDetailsModalOpen: false,
  createWorkspaceModalOpen: false,

  // Right Panel
  activeRightPanel: null, // null | 'members' | 'pins' (thread is handled via channelStore.isThreadOpen)

  // Presence and Typing
  onlineUserIds: new Set(),
  typingByTarget: {}, // targetId -> Array of { userId, displayName }

  // Notifications
  notificationsOpen: false,
  unreadNotificationsCount: 0,

  // Toast Notifications
  toasts: [],

  // Setters
  setSearchModalOpen: (open) => set({ searchModalOpen: open }),
  setCreateChannelModalOpen: (open) => set({ createChannelModalOpen: open }),
  setInviteModalOpen: (open) => set({ inviteModalOpen: open }),
  setProfileModalOpen: (open) => set({ profileModalOpen: open }),
  setChannelDetailsModalOpen: (open) => set({ channelDetailsModalOpen: open }),
  setCreateWorkspaceModalOpen: (open) => set({ createWorkspaceModalOpen: open }),
  setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setUnreadNotificationsCount: (count) => set({ unreadNotificationsCount: count }),

  // Online Presence
  setUserPresence: (userId, presence) => {
    set((state) => {
      const next = new Set(state.onlineUserIds);
      if (presence === 'online') {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { onlineUserIds: next };
    });
  },

  // Typing Indicators
  addTypingUser: (targetId, userId, displayName) => {
    set((state) => {
      const current = state.typingByTarget[targetId] || [];
      if (current.some((u) => u.userId === userId)) return state;

      return {
        typingByTarget: {
          ...state.typingByTarget,
          [targetId]: [...current, { userId, displayName }],
        },
      };
    });
  },

  removeTypingUser: (targetId, userId) => {
    set((state) => {
      const current = state.typingByTarget[targetId] || [];
      return {
        typingByTarget: {
          ...state.typingByTarget,
          [targetId]: current.filter((u) => u.userId !== userId),
        },
      };
    });
  },

  // Toast helper
  addToast: (message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
