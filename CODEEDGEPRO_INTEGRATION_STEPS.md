# CodeEdgePro ↔ AI Avengers — Step-by-Step Integration Guide

> Is guide ko upar se neeche follow karo. Har step ke saath **verify** command hai —
> jab tak verify pass na ho, agle step pe mat jao.
> Endpoint formats ke liye: `CODEEDGEPRO_REQUIRED_ENDPOINTS.md` dekho.

---

## PHASE 1 — BACKEND CHALU KARO (AI Avengers)

### Step 1.1: Requirements install karo
```bash
# Go 1.21+     → https://go.dev/dl/ (Windows installer)
# PostgreSQL 16 + pgvector extension
# Redis        → Windows pe: https://github.com/microsoftarchive/redis/releases
#                ya Docker: docker run -d -p 6379:6379 redis
```
**Verify:**
```bash
go version        # go1.21+ dikhna chahiye
psql --version    # psql 16.x
redis-cli ping    # PONG
```

### Step 1.2: Database banao
```bash
psql -U postgres
CREATE DATABASE ai_avengers;
\c ai_avengers
CREATE EXTENSION IF NOT EXISTS vector;
\q
```
**Verify:** `psql -U postgres -d ai_avengers -c "SELECT 1;"` → `1` aana chahiye

### Step 1.3: Backend .env set karo
```bash
cd "C:\Users\jai shree krishna\GensparkCode\AI_AVENGERS\backend-go"
copy .env.example .env
```
`.env` mein ye values set karo (baaki defaults chhod do):
```env
DATABASE_URL=postgres://postgres:<password>@localhost:5432/ai_avengers
REDIS_URL=localhost:6379
SELF_REGISTRATION_ENABLED=true    # ← MOBILE REGISTER KE LIYE ZAROORI
JWT_SECRET=<koi-bhi-32+-char-random-string>
```

### Step 1.4: Backend chalao
```bash
cd "C:\Users\jai shree krishna\GensparkCode\AI_AVENGERS\backend-go"
go run ./cmd/server
```
**Verify:**
```bash
curl http://localhost:8080/health
# ya koi bhi endpoint: {"success":...} envelope dikhna chahiye
```
❌ Agar DB migration errors aayein → migrations folder check karo, `docs/` mein setup notes hain.

---

## PHASE 2 — PEHLA USER + EXPERT (backend pe data)

### Step 2.1: Test user banao
```bash
curl -X POST http://localhost:8080/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@codeedge.com\",\"password\":\"test1234\",\"full_name\":\"Test User\"}"
```
**Verify:** Response mein `"success":true` + `tokenPair.accessToken` dikhna chahiye.
❌ 403 aaya → `.env` mein `SELF_REGISTRATION_ENABLED=true` set karke backend restart karo.

### Step 2.2: Access token save karo (testing ke liye)
```bash
# Response se accessToken copy karo, ab har request mein use hoga:
set TOKEN=<accessToken-yahan-paste>
```

### Step 2.3: Expert check karo
```bash
curl http://localhost:8080/api/v1/experts -H "Authorization: Bearer %TOKEN%"
```
**Verify:** `"data":[...]` mein kam se kam 1 expert hona chahiye.
❌ Empty array `[]` aaya → DB mein koi trained expert nahi hai. Expert banane ke liye
admin panel / ingestion pipeline chahiye (transcripts upload → training). Ye AI Avengers
ke admin flow se hota hai — bina trained expert ke **chat kabhi kaam nahi karega**
(baaki sab — login, projects, chats create — phir bhi test ho sakta hai).

---

## PHASE 3 — MOBILE APP CONNECT KARO

### Step 3.1: Apna LAN IP nikalo
```bash
ipconfig
# "Wireless LAN adapter Wi-Fi" ke neeche IPv4 Address dekho, e.g. 192.168.1.7
```
⚠️ Phone se `localhost` KABHI kaam nahi karta — LAN IP zaroori hai.
⚠️ Phone aur PC **same WiFi** pe hone chahiye.

### Step 3.2: App ka .env update karo
```bash
# File: C:\Users\jai shree krishna\GensparkCode\CodeEdgePro\.env
EXPO_PUBLIC_API_URL=http://192.168.1.7:8080/api/v1    # ← apna IP daalo
```

### Step 3.3: Windows Firewall port kholo (pehli baar)
```bash
# Admin PowerShell mein:
netsh advfirewall firewall add rule name="AIAvengers8080" dir=in action=allow protocol=TCP localport=8080
netsh advfirewall firewall add rule name="Metro8081" dir=in action=allow protocol=TCP localport=8081
```
**Verify:** Phone ke browser mein `http://192.168.1.7:8080/health` kholo → response aana chahiye.

### Step 3.4: Expo dev server chalao
```bash
cd "C:\Users\jai shree krishna\GensparkCode\CodeEdgePro"
npx expo start
# QR code dikhega
```

### Step 3.5: Phone pe app kholo
- **Android:** Play Store se "Expo Go" install karo → Expo Go kholo → "Scan QR code" → terminal wala QR scan karo
- **iPhone:** App Store se "Expo Go" install karo → Camera app se QR scan karo → Expo Go mein khulega

**Verify:** CodeEdgePro ki Login screen dikhni chahiye.
❌ "Network response timed out" → firewall/WiFi check karo (Step 3.3).

---

## PHASE 4 — END-TO-END FLOW TEST (app ke andar, is order mein)

### Step 4.1: Login
- Email: `test@codeedge.com`, Password: `test1234` → Login dabao
- ✅ Expect: Experts tab khul jaye
- ❌ Error aaye → Metro terminal ke logs dekho; `.env` ka IP verify karo

### Step 4.2: Experts dekho
- Experts tab pe list dikhni chahiye (Phase 2.3 wale experts)
- Kisi expert pe tap karo → detail screen (topics, stats)

### Step 4.3: Project banao
- Projects tab → `+` FAB → naam do → Create
- ✅ Expect: list mein project dikhe, "0 Experts" ke saath

### Step 4.4: Expert assign karo (CRITICAL — bina iske chat nahi chalega)
- Project pe tap → upar **"Manage Experts"** bar pe tap
- Available list se `+` dabake expert add karo
- ✅ Expect: Assigned section mein expert aa jaye

### Step 4.5: Chat banao
- Back jao → `+` FAB → chat title do → Start Chat

### Step 4.6: Message bhejo (SSE streaming test)
- Chat khulne pe neeche **expert chips** dikhenge (default: sab selected)
- Message likho → Send
- ✅ Expect: "..." placeholder → text **chunk-by-chunk stream** ho (single expert pe)
- ✅ Expect: complete hone pe final answer + reload pe tokens dikhein
- ❌ 400 aaye → koi expert chip selected nahi hai
- ❌ Error event aaye → backend logs dekho (LLM API key configured hai?)

### Step 4.7: Search test
- Search tab → 2+ characters type karo → search
- ✅ Expect: matching chats dikhein

### Step 4.8: Session persistence test
- App band karo, dobara kholo
- ✅ Expect: bina login ke seedha app khule (refresh cookie kaam kar rahi hai)
- ⚠️ Agar login screen aaye to ye known limitation ho sakti hai — mujhe batao,
  cookie persistence RN pe device-specific hoti hai, fallback fix karna padega

---

## PHASE 5 — PROBLEMS AAYEIN TO (Common Fixes)

| Problem | Fix |
|---|---|
| App: "Network Error" har jagah | `.env` IP galat / firewall / alag WiFi |
| Login 403 | `SELF_REGISTRATION_ENABLED` off hai — backend `.env` + restart |
| Experts list empty | DB mein trained expert nahi — admin ingestion chahiye |
| Message send pe 400 | Expert chip select nahi hai / project mein expert assign nahi |
| Message send pe error event | Backend LLM key missing — backend `.env` mein API keys check karo |
| Streaming nahi dikh rahi, direct answer | 1 se zyada expert selected hai — ye by-design hai (multi-expert = no chunk streaming) |
| App restart pe logout | Refresh cookie persist nahi hui — mujhe batao, fix karunga |
| `.env` change ke baad bhi purana IP | Expo restart karo: `npx expo start -c` (cache clear) |

---

## QUICK REFERENCE — SAB KUCH EK NAZAR MEIN

```
[Backend]  go run ./cmd/server              → :8080
[App]      npx expo start                   → :8081 + QR
[Phone]    Expo Go → QR scan               → app
[Flow]     Login → Project → Manage Experts → Chat → Send (chips select) → Stream
```

**App code already in sync hai in endpoints ke saath** — repos:
- https://github.com/rabbitmq1233-cmyk/codeedgepro_android
- https://github.com/rabbitmq1233-cmyk/codeedgepro_ios

Koi bhi step fail ho → mujhe exact error + kaunsa step batao, main fix karunga.
