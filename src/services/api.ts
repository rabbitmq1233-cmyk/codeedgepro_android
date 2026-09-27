// API Reference: verified line-by-line against backend-go/cmd/server/main.go
// and backend-go/internal/{auth,expert,project,chat,message}/*.go (read-only
// audit, no backend files were modified). See CODEEDGEPRO_API_REFERENCE.md
// for the full endpoint-by-endpoint diff against the earlier (wrong) draft.
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, SECURE_STORE_KEYS } from '../config/constants';
import type {
  AuthResponse,
  TokenPair,
  User,
  Expert,
  ExpertTopicsResponse,
  Project,
  Chat,
  Message,
  SSEEvent,
  SSECompleteEvent,
  SSESynthesisEvent,
  SearchResponse,
  APIResponse,
} from '../types';

const API_URL = API_CONFIG.baseUrl;

// SSE callback types for streaming. Matches the real event set emitted by
// message/handler.go's Handler.Send: thinking -> chunk* -> complete
// (once per expert) -> synthesis? (only when >1 expert) -> done. error can
// arrive instead of complete/done if the orchestrator fails.
export interface StreamCallbacks {
  onThinking?: (data: { message: string; experts: number }) => void;
  onChunk?: (content: string, expertId: string) => void;
  onComplete?: (data: SSECompleteEvent['data']) => void;
  onSynthesis?: (data: SSESynthesisEvent['data']) => void;
  onDone?: (data: { turn_number: number; duration_ms: number; message_ids: Record<string, string> }) => void;
  onError?: (message: string) => void;
}

// API Client
class AIAvengersClient {
  private api: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // WHY withCredentials: the refresh token travels as an httpOnly
      // Set-Cookie (name "refresh_token", Path=/) set by POST
      // /auth/login|/register|/refresh — this is never present in the
      // JSON body (main.go buildAuthResponse comment). React Native's
      // XHR/fetch networking layer maintains a native, persistent cookie
      // jar per app (same behavior as a mobile browser's cookie store,
      // no CORS concept applies here), so as long as every request
      // carries credentials the cookie round-trips automatically without
      // this client ever touching it directly — matching the backend's
      // intent that JS must never read/write that cookie.
      withCredentials: true,
    });

    // Request interceptor - attach JWT
    this.api.interceptors.request.use(async (config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor - handle token refresh on 401
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original?._retried) {
          original._retried = true;
          try {
            const newTokens = await this.refreshAccessToken();
            this.accessToken = newTokens.accessToken;
            await SecureStore.setItemAsync(SECURE_STORE_KEYS.accessToken, newTokens.accessToken);
            original.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.api(original);
          } catch (refreshError) {
            await this.clearSession();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ---- Session persistence ----
  // Only the (short-lived) access token is ever stored client-side. The
  // refresh token is httpOnly and inaccessible to JS by backend design —
  // trying to read it from Set-Cookie would fail even if attempted, since
  // the native networking stack strips httpOnly cookies from any
  // JS-visible response headers exactly like a browser would.
  private async setAccessToken(token: string) {
    this.accessToken = token;
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.accessToken, token);
  }

  private async clearSession() {
    this.accessToken = null;
    await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.accessToken);
  }

  /**
   * Called on app launch. There is no reliable way to know if the
   * httpOnly refresh cookie is still valid without asking the server —
   * so this always calls POST /auth/refresh (empty body; the persisted
   * native cookie jar attaches the cookie automatically). Success means
   * the session survives an app restart; failure (401) means the user
   * must log in again.
   */
  async restoreSession(): Promise<{ accessToken: string; user: User } | null> {
    try {
      const tokens = await this.refreshAccessToken();
      await this.setAccessToken(tokens.accessToken);
      const user = await this.getCurrentUser();
      return { accessToken: tokens.accessToken, user };
    } catch {
      await this.clearSession();
      return null;
    }
  }

  // ---- Auth endpoints ----
  // WHY full_name (snake_case) here but user.fullName (camelCase) in the
  // response: backend-go/cmd/server/main.go handleRegister binds
  // `FullName string `json:"full_name"`` on the request, but
  // buildAuthResponse() emits the user object in camelCase. The two
  // directions genuinely use different casing — not a typo.
  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const response = await this.api.post<APIResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    if (!response.data.success) throw new Error(response.data.error.message);
    const auth = response.data.data;
    await this.setAccessToken(auth.tokenPair.accessToken);
    return auth;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.api.post<APIResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    if (!response.data.success) throw new Error(response.data.error.message);
    const auth = response.data.data;
    await this.setAccessToken(auth.tokenPair.accessToken);
    return auth;
  }

  // Refresh response shape is NOT the same as login/register — main.go's
  // handleRefresh returns {accessToken, expiresInSeconds} directly, not
  // nested under tokenPair. Cookie is sent automatically (withCredentials).
  private async refreshAccessToken(): Promise<TokenPair> {
    const response = await this.api.post<APIResponse<TokenPair>>('/auth/refresh', {});
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout', {});
    } finally {
      await this.clearSession();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<APIResponse<User>>('/auth/me');
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  // ---- Expert endpoints ----
  // WHY no page/limit here: expert.Handler.ListActive (backend-go/internal
  // /expert/handler.go) takes no query params at all — it always returns
  // the full trained/active catalog for the caller's role+tenant scope.
  async getExperts(): Promise<Expert[]> {
    const response = await this.api.get<APIResponse<Expert[]>>('/experts');
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async getExpertDetails(expertId: string): Promise<Expert> {
    const response = await this.api.get<APIResponse<Expert>>(`/experts/${expertId}`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async getExpertTopics(expertId: string): Promise<ExpertTopicsResponse> {
    const response = await this.api.get<APIResponse<ExpertTopicsResponse>>(`/experts/${expertId}/topics`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  // ---- Project endpoints ----
  async createProject(name: string, description?: string): Promise<Project> {
    const response = await this.api.post<APIResponse<Project>>('/projects', { name, description });
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  // WHY no page/limit: project.Handler.List takes none — it returns every
  // active project owned by the caller.
  async getProjects(): Promise<Project[]> {
    const response = await this.api.get<APIResponse<Project[]>>('/projects');
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async getProjectDetails(projectId: string): Promise<Project> {
    const response = await this.api.get<APIResponse<Project>>(`/projects/${projectId}`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async addExpertToProject(projectId: string, expertId: string): Promise<void> {
    const response = await this.api.post<APIResponse<{ status: string }>>(
      `/projects/${projectId}/experts`,
      { expert_id: expertId }
    );
    if (!response.data.success) throw new Error(response.data.error.message);
  }

  async removeExpertFromProject(projectId: string, expertId: string): Promise<void> {
    const response = await this.api.delete<APIResponse<{ status: string }>>(
      `/projects/${projectId}/experts/${expertId}`
    );
    if (!response.data.success) throw new Error(response.data.error.message);
  }

  // ---- Chat endpoints ----
  // WHY title only: chats table has no description column — sending one
  // is silently ignored by project.Handler.CreateChat's ShouldBindJSON.
  async createChat(projectId: string, title: string): Promise<Chat> {
    const response = await this.api.post<APIResponse<Chat>>(`/projects/${projectId}/chats`, {
      title,
    });
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  // WHY no page/limit: project.Handler.ListChats takes none — always
  // returns every non-archived chat for the project, newest first.
  async getProjectChats(projectId: string): Promise<Chat[]> {
    const response = await this.api.get<APIResponse<Chat[]>>(`/projects/${projectId}/chats`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async getChatDetails(chatId: string): Promise<Chat> {
    const response = await this.api.get<APIResponse<Chat>>(`/chats/${chatId}`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    const response = await this.api.patch<APIResponse<{ status: string }>>(`/chats/${chatId}`, { title });
    if (!response.data.success) throw new Error(response.data.error.message);
  }

  async archiveChat(chatId: string): Promise<void> {
    const response = await this.api.delete<APIResponse<{ status: string }>>(`/chats/${chatId}`);
    if (!response.data.success) throw new Error(response.data.error.message);
  }

  // WHY fixed limit=50/offset=0: chat.Handler.ListMessages
  // (backend-go/internal/chat/service.go) hardcodes these values — no
  // query params are read from the request at all, so passing page/limit
  // here would do nothing.
  async getChatMessages(chatId: string): Promise<Message[]> {
    const response = await this.api.get<APIResponse<Message[]>>(`/chats/${chatId}/messages`);
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }

  // Message streaming with typed SSE event callbacks.
  // WHY expertIds must be non-empty: message/handler.go's
  // SendMessageRequest.ExpertIDs has `binding:"required,min=1"` — the
  // backend 400s immediately on an empty array. Callers MUST let the
  // user pick >=1 expert before invoking this (see ExpertPickerModal).
  async streamMessage(
    chatId: string,
    message: string,
    expertIds: string[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (expertIds.length === 0) {
      throw new Error('At least one expert must be selected before sending a message.');
    }

    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
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
              case 'thinking':
                callbacks.onThinking?.(event.data);
                break;
              case 'chunk':
                callbacks.onChunk?.(event.data.content, event.data.expert_id);
                break;
              case 'complete':
                callbacks.onComplete?.(event.data);
                break;
              case 'synthesis':
                callbacks.onSynthesis?.(event.data);
                break;
              case 'done':
                callbacks.onDone?.(event.data);
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

  async deleteMessage(messageId: string): Promise<void> {
    const response = await this.api.delete<APIResponse<{ status: string }>>(`/messages/${messageId}`);
    if (!response.data.success) throw new Error(response.data.error.message);
  }

  // ---- Search endpoint ----
  // WHY q must be >=2 chars, no page param: handleSearchChats
  // (backend-go/cmd/server/main.go) 400s under 2 chars and only reads
  // `limit` (default 20) — there is no page/offset support.
  async searchChats(query: string, limit: number = 20): Promise<SearchResponse> {
    const response = await this.api.get<APIResponse<SearchResponse>>('/search/chats', {
      params: { q: query, limit },
    });
    if (!response.data.success) throw new Error(response.data.error.message);
    return response.data.data;
  }
}

export const apiClient = new AIAvengersClient();
