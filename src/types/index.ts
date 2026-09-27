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
  ChatDetail: { chatId: string; chatTitle: string; projectId: string };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Settings: undefined;
};

// ---- Auth Types ----
// Verified against backend-go/cmd/server/main.go buildAuthResponse().
// WHY camelCase here: the auth endpoints (login/register) are the ONLY
// endpoints that return camelCase — every other endpoint (experts,
// projects, chats, messages) returns snake_case. This asymmetry is
// intentional on the backend (see main.go comment on buildAuthResponse).
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  totpEnabled: boolean;
}

export interface TokenPair {
  accessToken: string;
  expiresInSeconds: number;
}

// AuthResponse is the `data` field of POST /auth/login and /auth/register.
// NOTE: the refresh token is NEVER in this body — the backend sets it as
// an httpOnly Set-Cookie header (name "refresh_token", Path=/). A mobile
// client must read it from the raw Set-Cookie response header (axios does
// not expose this on React Native — see api.ts loginRaw() for the fetch()
// based workaround) and persist it itself; there is no JSON field to read.
export interface AuthResponse {
  user: User;
  tokenPair: TokenPair;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

// ---- Expert Types ----
// Verified against backend-go/internal/expert/handler.go ExpertPublic.
export interface Expert {
  id: string;
  name: string;
  slug: string;
  domain: string;
  description: string;
  total_chunks: number;
  total_topics: number;
  avg_depth_level: number;
  avg_rating: number;
  created_at: string;
}

export interface ExpertTopic {
  topic: string;
  depth_level: number;
  chunk_count: number;
  complexity_ceiling: string;
  measured_level: number;
  eval_cases: number;
  eval_passed: number;
  can_handle: string[];
  cannot_handle: string[];
  last_evaluated_at: string | null;
}

export interface ExpertTopicsResponse {
  expert_id: string;
  topics: ExpertTopic[];
  total: string;
}

// ---- Project Types ----
// Verified against backend-go/internal/project/service.go Project struct.
// WHY no expert_count/chat_count: the backend does not compute or return
// these fields. `experts` is the full assigned-expert array (use
// experts.length in the UI); chat count needs a separate
// GET /projects/:id/chats call and is NOT embedded on the project.
export interface ProjectExpert {
  expert_id: string;
  expert_name: string;
  domain: string;
  added_at: string;
  is_active: boolean;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string;
  status: string;
  repo_url?: string;
  repo_provider?: string;
  repo_branch?: string;
  repo_connected: boolean;
  tech_stack: Record<string, unknown>;
  architecture_type?: string;
  created_at: string;
  updated_at: string;
  experts: ProjectExpert[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

// ---- Chat Types ----
// Verified against backend-go/internal/chat/service.go Chat struct.
// WHY no `description`: POST /projects/:id/chats only accepts `title` —
// the backend has no chats.description column, any description sent is
// silently dropped.
export interface Chat {
  id: string;
  project_id: string;
  client_id: string;
  title: string;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChatRequest {
  title: string;
}

// ---- Message Types ----
// Verified against backend-go/internal/chat/service.go Message struct.
export interface Citation {
  chunk_id: string;
  text: string;
  score: number;
  source_name?: string;
  chunk_index?: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  turn_number: number;
  expert_id?: string;
  decision_mode?: string;
  citations?: Citation[];
  confidence?: number;
  tokens_used?: number;
  cost_usd?: number;
  warning_text?: string;
  clarifying_questions?: string[];
  reply_to_message_id?: string;
  template_sections?: unknown;
  quality_score?: number;
  coverage?: string;
  refusal_reason?: string;
  created_at: string;
}

// SendMessageRequest — POST /chats/:id/messages body.
// WHY expert_ids is required, min 1: backend binding tag is
// `binding:"required,min=1"` (message/handler.go SendMessageRequest).
// An empty array 400s immediately — the UI MUST let the user pick at
// least one expert before this call can ever succeed.
export interface SendMessageRequest {
  message: string;
  expert_ids: string[];
  reply_to_message_id?: string;
  include_full_thread?: boolean;
}

// ---- SSE Event Types ----
// Verified against backend-go/internal/message/handler.go SSE* consts
// and the sendSSE() call sites in Handler.Send. Real event set is
// thinking | chunk | complete | synthesis | done | error — there is no
// "meta" event, and no per-message token/cost is streamed at all (only
// available later by re-fetching the message list, where cost_usd/
// tokens_used are populated on the Message).
export interface SSEThinkingEvent {
  type: 'thinking';
  data: { message: string; experts: number };
}

export interface SSEChunkEvent {
  type: 'chunk';
  data: { content: string; expert_id: string };
}

export interface SSECompleteEvent {
  type: 'complete';
  data: {
    expert_id: string;
    expert_name: string;
    domain: string;
    mode: string;
    content: string;
    citations: Citation[];
    confidence: number;
    gate_stopped?: boolean;
    warning?: string;
    questions?: string[];
    template_sections?: unknown;
    claims?: unknown;
  };
}

export interface SynthesisContradiction {
  summary: string;
  resolution: string;
  [key: string]: unknown;
}

export interface SSESynthesisEvent {
  type: 'synthesis';
  data: {
    agreements: string[];
    contradictions: SynthesisContradiction[];
    summary: string;
    method: string;
    needs_escalation: boolean;
  };
}

export interface SSEDoneEvent {
  type: 'done';
  data: {
    turn_number: number;
    duration_ms: number;
    message_ids: Record<string, string>; // expert_id -> message_id
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: { message: string };
}

export type SSEEvent =
  | SSEThinkingEvent
  | SSEChunkEvent
  | SSECompleteEvent
  | SSESynthesisEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// ---- Search Types ----
// Verified against backend-go/internal/chat/search.go ChatSearchResult.
export interface SearchResult {
  chat_id: string;
  chat_title: string;
  project_id: string;
  project_name: string;
  message_count: number;
  is_archived: boolean;
  updated_at: string;
  title_match: boolean;
  content_matches: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

// ---- API Response Envelope ----
// Every backend-go response uses this envelope (internal/response/response.go).
export interface APISuccessResponse<T> {
  success: true;
  data: T;
  meta: { request_id: string; timestamp: string };
}

export interface APIErrorResponse {
  success: false;
  error: { code: string; message: string; details?: Record<string, string> };
  meta: { request_id: string; timestamp: string };
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;
