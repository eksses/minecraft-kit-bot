import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (username, password) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'include',
        });
        
        if (!res.ok) throw new Error('Invalid credentials');
        
        const data = await res.json();
        set({ user: data.user, isAuthenticated: true });
      },
      
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        set({ user: null, isAuthenticated: false });
      },
      
      checkAuth: async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            set({ user: data, isAuthenticated: true });
          } else {
            set({ user: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const useBotStore = create((set) => ({
  status: { online: false, username: 'Unknown', server: 'Unknown' },
  
  fetchStatus: async () => {
    try {
      const res = await fetch('/api/bot/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ status: data });
      }
    } catch {
      set({ status: { online: false, username: 'Unknown', server: 'Unknown' } });
    }
  },
}));

export const useChestStore = create((set, get) => ({
  chests: {},
  isLoading: false,
  error: null,
  
  fetchChests: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/chests', { credentials: 'include' });
      const data = await res.json();
      set({ chests: data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch chests', isLoading: false });
    }
  },
  
  saveChest: async (name, chest) => {
    const res = await fetch('/api/chests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...chest }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to save chest');
    get().fetchChests();
  },
  
  updateChest: async (name, chest) => {
    const res = await fetch(`/api/chests/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chest),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to update chest');
    get().fetchChests();
  },
  
  deleteChest: async (name) => {
    const res = await fetch(`/api/chests/${name}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete chest');
    get().fetchChests();
  },
}));