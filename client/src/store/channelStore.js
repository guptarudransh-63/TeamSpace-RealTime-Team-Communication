import { create } from 'zustand';
import { api } from '../api/client.js';

export const useChannelStore = create((set, get) => ({
  channels: [],
  conversations: [],
  currentChannel: null,
  currentConversation: null,
  activeView: 'channel', // 'channel' | 'conversation'

  // Messages in active conversation/channel
  messages: [],
  hasMore: false,
  nextCursor: null,
  isLoadingMessages: false,
  isLoadingMore: false,

  // Thread sidebar state
  threadParent: null,
  threadReplies: [],
  isThreadOpen: false,
  isLoadingThread: false,

  // Channel details & members modal
  channelMembers: [],

  setChannels: (channels) => set({ channels }),
  setConversations: (conversations) => set({ conversations }),

  selectChannel: async (channel) => {
    set({
      currentChannel: channel,
      currentConversation: null,
      activeView: 'channel',
      messages: [],
      hasMore: false,
      nextCursor: null,
      isLoadingMessages: true,
      // Keep thread open if same channel, otherwise close
      isThreadOpen: get().threadParent?.targetId === channel._id ? get().isThreadOpen : false,
    });

    try {
      const res = await api.get(`/messages/channel/${channel._id}?limit=40`);
      set({
        messages: res.data.messages,
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor,
        isLoadingMessages: false,
      });
    } catch (err) {
      console.error('[Load Channel Messages Error]', err);
      set({ isLoadingMessages: false });
    }
  },

  selectConversation: async (conversation) => {
    set({
      currentConversation: conversation,
      currentChannel: null,
      activeView: 'conversation',
      messages: [],
      hasMore: false,
      nextCursor: null,
      isLoadingMessages: true,
      isThreadOpen: false,
    });

    try {
      const res = await api.get(`/messages/conversation/${conversation._id}?limit=40`);
      set({
        messages: res.data.messages,
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor,
        isLoadingMessages: false,
      });
    } catch (err) {
      console.error('[Load Conversation Messages Error]', err);
      set({ isLoadingMessages: false });
    }
  },

  loadOlderMessages: async () => {
    const { nextCursor, currentChannel, currentConversation, activeView, hasMore, isLoadingMore } = get();
    if (!hasMore || !nextCursor || isLoadingMore) return;

    const targetId = activeView === 'channel' ? currentChannel?._id : currentConversation?._id;
    if (!targetId) return;

    set({ isLoadingMore: true });
    try {
      const endpoint =
        activeView === 'channel'
          ? `/messages/channel/${targetId}?limit=30&cursor=${nextCursor}&direction=older`
          : `/messages/conversation/${targetId}?limit=30&cursor=${nextCursor}&direction=older`;

      const res = await api.get(endpoint);
      set((state) => ({
        messages: [...res.data.messages, ...state.messages],
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor,
        isLoadingMore: false,
      }));
    } catch (err) {
      console.error('[Load Older Messages Error]', err);
      set({ isLoadingMore: false });
    }
  },

  openThread: async (parentMessage) => {
    set({
      threadParent: parentMessage,
      isThreadOpen: true,
      threadReplies: [],
      isLoadingThread: true,
    });

    try {
      const res = await api.get(`/messages/thread/${parentMessage._id}`);
      set({
        threadParent: res.data.parentMessage,
        threadReplies: res.data.messages,
        isLoadingThread: false,
      });
    } catch (err) {
      console.error('[Load Thread Error]', err);
      set({ isLoadingThread: false });
    }
  },

  closeThread: () => {
    set({ isThreadOpen: false, threadParent: null, threadReplies: [] });
  },

  // Socket event handlers
  addMessage: (message) => {
    const { currentChannel, currentConversation, activeView, messages } = get();
    const activeTargetId = activeView === 'channel' ? currentChannel?._id : currentConversation?._id;

    if (message.targetId === activeTargetId && !message.parentId) {
      // Prevent duplicates
      if (!messages.some((m) => m._id === message._id)) {
        set((state) => ({ messages: [...state.messages, message] }));
      }
    }
  },

  addThreadReply: (reply) => {
    const { threadParent, messages } = get();

    // If active thread is this parent
    if (threadParent && threadParent._id === reply.parentId) {
      set((state) => ({
        threadReplies: [...state.threadReplies, reply],
        threadParent: {
          ...state.threadParent,
          replyCount: (state.threadParent.replyCount || 0) + 1,
          lastReplyAt: reply.createdAt,
        },
      }));
    }

    // Also update parent reply count in main timeline
    set({
      messages: messages.map((m) =>
        m._id === reply.parentId
          ? {
              ...m,
              replyCount: (m.replyCount || 0) + 1,
              lastReplyAt: reply.createdAt,
            }
          : m
      ),
    });
  },

  updateReaction: (messageId, reactions) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      ),
      threadParent:
        state.threadParent?._id === messageId
          ? { ...state.threadParent, reactions }
          : state.threadParent,
      threadReplies: state.threadReplies.map((r) =>
        r._id === messageId ? { ...r, reactions } : r
      ),
    }));
  },

  updateMessage: (updatedMessage) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === updatedMessage._id ? updatedMessage : m
      ),
      threadReplies: state.threadReplies.map((r) =>
        r._id === updatedMessage._id ? updatedMessage : r
      ),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
      threadReplies: state.threadReplies.filter((r) => r._id !== messageId),
    }));
  },

  loadChannelMembers: async (channelId) => {
    try {
      const res = await api.get(`/channels/${channelId}/members`);
      set({ channelMembers: res.data.members });
    } catch (err) {
      console.error('[Load Channel Members Error]', err);
    }
  },
}));
