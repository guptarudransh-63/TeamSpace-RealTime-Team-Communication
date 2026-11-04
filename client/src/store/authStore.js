import { create } from 'zustand';
import { api } from '../api/client.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  workspaces: [],
  currentWorkspace: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/auth/me');
      const { user, workspaces } = res.data;
      
      const currentWorkspace =
        workspaces.length > 0
          ? get().currentWorkspace || workspaces[0]
          : null;

      set({
        user,
        workspaces,
        currentWorkspace,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        workspaces: [],
        currentWorkspace: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    await get().checkAuth();
    return res;
  },

  register: async (email, password, displayName, inviteToken) => {
    const res = await api.post('/auth/register', {
      email,
      password,
      displayName,
      inviteToken,
    });
    await get().checkAuth();
    return res;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({
        user: null,
        workspaces: [],
        currentWorkspace: null,
        isAuthenticated: false,
      });
    }
  },

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
  },

  updateProfile: async (data) => {
    const res = await api.patch('/auth/profile', data);
    set((state) => ({
      user: { ...state.user, ...res.data.user },
    }));
    return res;
  },

  updateStatus: async (data) => {
    const res = await api.patch('/auth/status', data);
    set((state) => ({
      user: { ...state.user, status: res.data.status },
    }));
    return res;
  },

  updatePresence: async (presence) => {
    const res = await api.patch('/auth/presence', { presence });
    set((state) => ({
      user: { ...state.user, presence: res.data.presence },
    }));
    return res;
  },

  addWorkspace: (workspace) => {
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      currentWorkspace: workspace,
    }));
  },
}));
