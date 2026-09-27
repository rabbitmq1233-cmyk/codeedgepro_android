// ============================================================
// CodeEdgePro - Type Definitions
// All shared TypeScript types for the application
// ============================================================

// ---- Navigation Types ----
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  ExpertsTab: undefined;
  ProjectsTab: undefined;
  SearchTab: undefined;
  ProfileTab: undefined;
};

export type ExpertsStackParamList = {
  ExpertList: undefined;
  ExpertDetail: { expertId: string };
};

export type ProjectsStackParamList = {
  ProjectList: undefined;
  CreateProject: undefined;
  ChatList: { projectId: string; projectName: string };
  CreateChat: { projectId: string };
  ChatDetail: { chatId: string; chatTitle: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Settings: undefined;
};

// ---- Auth Types ----
export interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  totp_enabled: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

// ---- Expert Types ----
export interface Expert {
  id: string;
  name: string;
  description: string;
  charter?: string;
  rating: number;
  version: string;
  active: boolean;
  coverage_percentage?: number;
  usage_count?: number;
  last_updated?: string;
  topics?: string[];
}

export interface ExpertTopic {
  name: string;
  coverage: number;
  depth: string;
}

export interface ExpertTopicsResponse {
  topics: ExpertTopic[];
  total_topics: number;
}

// ---- Project Types ----
export interface Project {
  id: string;
  name: string;
  description: string;
  expert_count: number;
  chat_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

// ---- Chat Types ----
export interface Chat {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  message_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateChatRequest {
  title: string;
  description?: string;
}

// ---- Message Types ----
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  cost_usd?: number;
  citations?: Citation[];
  created_at: string;
}

export interface Citation {
  chunk_id: string;
  source: string;
  score: number;
}

export interface SendMessageRequest {
  message: string;
  expert_ids: string[];
}

// ---- SSE Event Types ----
export interface SSEChunkEvent {
  type: 'chunk';
  data: {
    content: string;
  };
}

export interface SSEMetaEvent {
  type: 'meta';
  data: {
    tokens: number;
    cost_usd: number;
    citations?: Citation[];
  };
}

export interface SSEDoneEvent {
  type: 'done';
  data: {
    message_id: string;
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: {
    message: string;
  };
}

export type SSEEvent = SSEChunkEvent | SSEMetaEvent | SSEDoneEvent | SSEErrorEvent;

// ---- Search Types ----
export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  relevance_score: number;
  type: 'chat' | 'expert' | 'project';
}

// ---- API Response Wrapper ----
export interface APIResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
