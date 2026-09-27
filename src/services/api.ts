// API Reference: See CODEEDGEPRO_API_REFERENCE.md
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, SECURE_STORE_KEYS } from '../config/constants';
import type {
  AuthResponse,
  Expert,
  Project,
  Chat,
  Message,
  SSEEvent,
  SearchResult,
} from '../types';

const API_URL = API_CONFIG.baseUrl;

// SSE callback types for streaming
export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onMeta?: (meta: { tokens: number; cost_usd: number }) => void;
  onDone?: (messageId: string) => void;
  onError?: (error: string) => void;
}

// API Client
class AIAvengersClient {
  private api: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - attach JWT
    this.api.interceptors.request.use(async (config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor - handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            const newTokens = await this.refreshAccessToken();
            this.accessToken = newTokens.access_token;
            await SecureStore.setItemAsync('accessToken', newTokens.access_token);
            
            // Retry original request
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.api(error.config);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  }

  async getStoredTokens() {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (accessToken && refreshToken) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    }
    return { accessToken, refreshToken };
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post<{ data: AuthResponse }>('/auth/login', {
      email,
      password,
    });
    const tokens = response.data.data;
    await this.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  private async refreshAccessToken() {
    const response = await this.api.post('/auth/refresh');
    return response.data.data;
  }

  async logout() {
    try {
      await this.api.post('/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data.data;
  }

  // Expert endpoints
  async getExperts(page: number = 0, limit: number = 20) {
    const response = await this.api.get('/experts', {
      params: { page, limit },
    });
    return response.data.data;
  }

  async getExpertDetails(expertId: string) {
    const response = await this.api.get(`/experts/${expertId}`);
    return response.data.data;
  }

  async getExpertTopics(expertId: string) {
    const response = await this.api.get(`/experts/${expertId}/topics`);
    return response.data.data;
  }

  // Project endpoints
  async createProject(name: string, description?: string) {
    const response = await this.api.post('/projects', { name, description });
    return response.data.data;
  }

  async getProjects(page: number = 0, limit: number = 20) {
    const response = await this.api.get('/projects', {
      params: { page, limit },
    });
    return response.data.data;
  }

  async getProjectDetails(projectId: string) {
    const response = await this.api.get(`/projects/${projectId}`);
    return response.data.data;
  }

  async addExpertToProject(projectId: string, expertId: string) {
    const response = await this.api.post(`/projects/${projectId}/experts`, {
      expert_id: expertId,
    });
    return response.data.data;
  }

  async removeExpertFromProject(projectId: string, expertId: string) {
    const response = await this.api.delete(
      `/projects/${projectId}/experts/${expertId}`
    );
    return response.data.data;
  }

  // Chat endpoints
  async createChat(projectId: string, title: string, description?: string) {
    const response = await this.api.post(`/projects/${projectId}/chats`, {
      title,
      description,
    });
    return response.data.data;
  }

  async getProjectChats(projectId: string, page: number = 0, limit: number = 20) {
    const response = await this.api.get(`/projects/${projectId}/chats`, {
      params: { page, limit },
    });
    return response.data.data;
  }

  async getChatMessages(chatId: string, page: number = 0, limit: number = 50) {
    const response = await this.api.get(`/chats/${chatId}/messages`, {
      params: { page, limit },
    });
    return response.data.data;
  }

  // Message streaming with typed SSE event callbacks
  async streamMessage(
    chatId: string,
    message: string,
    expertIds: string[],
    callbacks: StreamCallbacks
  ) {
    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        expert_ids: expertIds,
      }),
    });

    if (!response.ok) {
      throw new Error(`Message streaming failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');

      // Keep last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'chunk':
                callbacks.onChunk(event.data.content);
                break;
              case 'meta':
                callbacks.onMeta?.(event.data);
                break;
              case 'done':
                callbacks.onDone?.(event.data.message_id);
                break;
              case 'error':
                callbacks.onError?.(event.data.message);
                break;
            }
          } catch (e) {
            console.warn('Failed to parse SSE event:', e);
          }
        }
      }
    }
  }

  // Search endpoint
  async searchChats(query: string, page: number = 0, limit: number = 20) {
    const response = await this.api.get('/search/chats', {
      params: { q: query, page, limit },
    });
    return response.data.data;
  }
}

export const apiClient = new AIAvengersClient();
