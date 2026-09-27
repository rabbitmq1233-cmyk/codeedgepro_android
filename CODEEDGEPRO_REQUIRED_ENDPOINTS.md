# CodeEdgePro Mobile App — Required API Endpoints (AI Avengers Backend)

> Ye file CodeEdgePro mobile app ke liye zaroori SABHI endpoints ka exact contract hai.
> Base URL: `http://<host>:8080/api/v1`
> Har response is envelope mein aata hai:
> ```json
> // Success
> { "success": true, "data": <payload>, "meta": { "request_id": "...", "timestamp": "..." } }
> // Error
> { "success": false, "error": { "code": "...", "message": "..." }, "meta": { ... } }
> ```
> Auth header (har protected endpoint pe): `Authorization: Bearer <access_token>`

---

## MUJHE (APP KO) YE CHAHIYE TUMSE — CHECKLIST

| # | Cheez | Kyun chahiye | Status |
|---|---|---|---|
| 1 | Backend chalta hua (`:8080`) | App connect karegi | ❌ PENDING |
| 2 | `SELF_REGISTRATION_ENABLED=true` YA ek test account (email+password) | Login test ke liye | ❌ PENDING |
| 3 | Kam se kam 1 trained expert DB mein (`training_status='trained'`, `is_active=true`) | Bina expert ke chat kabhi nahi chalega | ❌ PENDING |
| 4 | Backend ka LAN IP (e.g. `192.168.1.7`) | Phone se localhost nahi chalta — `.env` mein daalna hai | ❌ PENDING |

Ye 4 cheezein de do → app end-to-end live test ho jayegi.

---

## 1. AUTH ENDPOINTS

### 1.1 POST /auth/register
```json
// Request
{ "email": "user@test.com", "password": "min8chars", "full_name": "Test User" }

// Response data (⚠️ camelCase — sirf auth endpoints camelCase hain)
{
  "user": { "id": "uuid", "email": "user@test.com", "fullName": "Test User", "role": "client", "totpEnabled": false },
  "tokenPair": { "accessToken": "jwt...", "expiresInSeconds": 28800 }
}
```
- ⚠️ Refresh token body mein NAHI aata — httpOnly `Set-Cookie: refresh_token=...; Path=/` header mein aata hai
- ⚠️ `SELF_REGISTRATION_ENABLED=false` (default) ho to 403 aayega

### 1.2 POST /auth/login
```json
// Request
{ "email": "user@test.com", "password": "..." }
// Response data: same as register (user + tokenPair + refresh cookie)
```

### 1.3 POST /auth/refresh
```json
// Request: empty body {} — cookie se refresh token jaata hai
// (non-browser fallback: { "refresh_token": "..." } body mein bhi accept hota hai)

// Response data (⚠️ tokenPair nesting NAHI hai yahan, flat hai)
{ "accessToken": "jwt...", "expiresInSeconds": 28800 }
```
- Rotation hota hai — naya refresh cookie set hota hai har call pe

### 1.4 POST /auth/logout
```json
// Request: empty body {} + Authorization header
// Response data: { "message": "logged out" }
```

### 1.5 GET /auth/me
```json
// Response data: user object (camelCase, same as login ka user)
```

---

## 2. EXPERT ENDPOINTS (⚠️ yahan se sab snake_case)

### 2.1 GET /experts
```json
// No params. Response data: array
[{
  "id": "uuid", "name": "DSA Expert", "slug": "dsa-expert", "domain": "algorithms",
  "description": "...", "total_chunks": 1500, "total_topics": 45,
  "avg_depth_level": 3.2, "avg_rating": 4.5, "created_at": "2026-01-01T00:00:00Z"
}]
```
- Sirf `training_status='trained' AND is_active=true AND is_training=false` wale experts aate hain

### 2.2 GET /experts/:id
Same single object as above.

### 2.3 GET /experts/:id/topics
```json
// Response data
{
  "expert_id": "uuid",
  "topics": [{
    "topic": "Binary Trees", "depth_level": 4, "chunk_count": 120,
    "complexity_ceiling": "hard", "measured_level": 3, "eval_cases": 10,
    "eval_passed": 8, "can_handle": ["..."], "cannot_handle": ["..."],
    "last_evaluated_at": "2026-01-01T00:00:00Z"
  }],
  "total": "45"
}
```

---

## 3. PROJECT ENDPOINTS

### 3.1 POST /projects
```json
// Request
{ "name": "My Project", "description": "optional" }
// Response data (201)
{
  "id": "uuid", "client_id": "uuid", "name": "My Project", "description": "...",
  "status": "active", "repo_url": "", "repo_provider": "", "repo_branch": "main",
  "repo_connected": false, "tech_stack": {}, "architecture_type": "",
  "created_at": "...", "updated_at": "...", "experts": []
}
```
- ⚠️ `expert_count` / `chat_count` fields EXIST NAHI karti — `experts` array hai

### 3.2 GET /projects
Array of project objects (above shape).

### 3.3 GET /projects/:id
Single project object — `experts` array populated:
```json
"experts": [{ "expert_id": "uuid", "expert_name": "DSA Expert", "domain": "algorithms", "added_at": "...", "is_active": true }]
```

### 3.4 POST /projects/:id/experts
```json
// Request
{ "expert_id": "uuid" }
// Response data: { "status": "expert added" }
```

### 3.5 DELETE /projects/:id/experts/:expertId
```json
// Response data: { "status": "expert removed" }
```

---

## 4. CHAT ENDPOINTS

### 4.1 POST /projects/:id/chats
```json
// Request (⚠️ SIRF title — description column exist nahi karta)
{ "title": "How to design auth?" }
// Response data (201)
{ "id": "uuid", "project_id": "uuid", "title": "...", "created_at": "..." }
```

### 4.2 GET /projects/:id/chats
```json
// Response data: array (⚠️ no pagination params — sab aata hai)
[{ "id": "uuid", "title": "...", "message_count": 4, "is_archived": false, "created_at": "...", "updated_at": "..." }]
```

### 4.3 GET /chats/:id
```json
{ "id": "uuid", "project_id": "uuid", "client_id": "uuid", "title": "...", "message_count": 4, "is_archived": false, "created_at": "...", "updated_at": "..." }
```

### 4.4 PATCH /chats/:id
```json
// Request: { "title": "new title" } → { "status": "updated" }
```

### 4.5 DELETE /chats/:id (archive/soft) → `{ "status": "archived" }`

### 4.6 GET /chats/:id/messages
```json
// ⚠️ NO pagination params — backend hardcoded limit=50 offset=0
// Response data: array
[{
  "id": "uuid", "chat_id": "uuid", "role": "user|assistant", "content": "...",
  "turn_number": 1, "expert_id": "uuid|null", "decision_mode": "ADVISE",
  "citations": [{ "chunk_id": "uuid", "text": "...", "score": 0.92, "source_name": "file.txt", "chunk_index": 42 }],
  "confidence": 0.85, "tokens_used": 450, "cost_usd": 0.002,
  "warning_text": "", "clarifying_questions": [],
  "reply_to_message_id": null, "template_sections": null,
  "quality_score": 0.9, "coverage": "YES", "refusal_reason": "",
  "created_at": "2026-01-01T00:00:00Z"
}]
```

---

## 5. MESSAGE SEND — SSE STREAMING (SABSE CRITICAL)

### 5.1 POST /chats/:id/messages
```json
// Request
{
  "message": "How should I design the user table?",
  "expert_ids": ["uuid1"],              // ⚠️ REQUIRED, MIN 1 — empty array = 400
  "reply_to_message_id": "uuid",        // optional
  "include_full_thread": false          // optional
}
```

**Response: `Content-Type: text/event-stream`** — har line `data: {json}\n\n` format:

```
data: {"type":"thinking","data":{"message":"Processing your request...","experts":1}}

data: {"type":"chunk","data":{"content":"Use UUID","expert_id":"uuid1"}}     ← SIRF single-expert pe streaming
data: {"type":"chunk","data":{"content":" primary keys...","expert_id":"uuid1"}}

data: {"type":"complete","data":{
  "expert_id":"uuid1","expert_name":"DB Expert","domain":"databases",
  "mode":"ADVISE","content":"<full answer>",
  "citations":[{"chunk_id":"...","text":"...","score":0.9,"source_name":"...","chunk_index":1}],
  "confidence":0.85,"gate_stopped":false,"warning":"","questions":[],
  "template_sections":null,"claims":null
}}

data: {"type":"synthesis","data":{...}}   ← SIRF jab >1 expert (agreements/contradictions/summary)

data: {"type":"done","data":{"turn_number":3,"duration_ms":4521,"message_ids":{"uuid1":"msg-uuid"}}}
```

**Error path:**
```
data: {"type":"error","data":{"message":"Processing failed"}}
data: {"type":"done"}
```

- ⚠️ Event types: `thinking | chunk | complete | synthesis | done | error` — koi "meta" event NAHI hai
- ⚠️ `chunk` events sirf tab jab EXACTLY 1 expert selected ho; multi-expert pe direct `complete` aata hai
- ⚠️ Token/cost SSE mein stream NAHI hota — `done` ke baad GET /chats/:id/messages se milta hai

---

## 6. SEARCH

### 6.1 GET /search/chats?q=<query>&limit=20
```json
// ⚠️ q minimum 2 characters, warna 400. No page param.
// Response data
{
  "query": "auth",
  "results": [{
    "chat_id": "uuid", "chat_title": "Auth design", "project_id": "uuid",
    "project_name": "My Project", "message_count": 6, "is_archived": false,
    "updated_at": "...", "title_match": true, "content_matches": 3
  }]
}
```

---

## 7. COMMON ERROR CODES

| HTTP | code | Kab |
|---|---|---|
| 400 | `INVALID_INPUT`, `INVALID_ID`, `QUERY_TOO_SHORT`, `MISSING_TOKEN` | Validation fail |
| 401 | `UNAUTHORIZED` | Token missing/expired/invalid |
| 403 | `FORBIDDEN` | Self-registration off / expert not granted / tenant mismatch |
| 404 | `NOT_FOUND` | Resource nahi mila / doosre ka hai |
| 500 | `INTERNAL_ERROR` | Server error |

---

## 8. BACKEND START KARNE KE LIYE (tumhare liye reference)

```bash
# Requirements: Go 1.21+, PostgreSQL (pgvector), Redis
cd AI_AVENGERS/backend-go
cp .env.example .env        # DB creds + SELF_REGISTRATION_ENABLED=true set karo
go run ./cmd/server         # port 8080
```

App side pe bas ye karna hai (main kar dunga):
```
# CodeEdgePro/.env
EXPO_PUBLIC_API_URL=http://<TUMHARA_LAN_IP>:8080/api/v1
```

---
*Generated from read-only audit of backend-go source (main.go, expert/project/chat/message handlers). App code in codeedgepro_android / codeedgepro_ios repos is already aligned to these exact contracts.*
