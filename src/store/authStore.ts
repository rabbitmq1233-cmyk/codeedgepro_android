import { create } from 'zustand';
import { apiClient } from '../services/api';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  register: (email: string, password: string, fullName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,

  register: async (email, password, fullName) => {
    try {
      set({ isLoading: true, error: null });
      const auth = await apiClient.register(email, password, fullName);
      set({ user: auth.user, isLoggedIn: true, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Registration failed',
      });
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const auth = await apiClient.login(email, password);
      set({ user: auth.user, isLoggedIn: true, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Login failed',
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await apiClient.logout();
      set({ user: null, isLoggedIn: false, isLoading: false, error: null });
    } catch (error: any) {
      // Even if the network logout fails, the local session is cleared.
      set({ user: null, isLoggedIn: false, isLoading: false, error: null });
    }
  },

  restoreToken: async () => {
    try {
      set({ isLoading: true });
      const restored = await apiClient.restoreSession();
      if (restored) {
        set({ user: restored.user, isLoggedIn: true, isLoading: false });
      } else {
        set({ isLoggedIn: false, isLoading: false });
      }
    } catch {
      set({ isLoggedIn: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
