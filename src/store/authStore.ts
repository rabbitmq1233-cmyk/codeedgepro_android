import { create } from 'zustand';
import { apiClient } from '../services/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  totp_enabled: boolean;
}

interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (email: string, password: string, name: string) => Promise<void>;
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

  register: async (email, password, name) => {
    try {
      set({ isLoading: true, error: null });
      await apiClient.register(email, password, name);
      // After registration, auto-login
      await apiClient.login(email, password);
      const user = await apiClient.getCurrentUser();
      set({ user, isLoggedIn: true, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Registration failed',
      });
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const authResponse = await apiClient.login(email, password);
      set({
        user: authResponse.user,
        isLoggedIn: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Login failed',
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await apiClient.logout();
      set({
        user: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Logout failed',
      });
      throw error;
    }
  },

  restoreToken: async () => {
    try {
      set({ isLoading: true });
      const tokens = await apiClient.getStoredTokens();
      if (tokens.accessToken && tokens.refreshToken) {
        // Verify token is still valid by fetching current user
        const user = await apiClient.getCurrentUser();
        set({ user, isLoggedIn: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      // Token was invalid or expired
      await apiClient.clearTokens();
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
