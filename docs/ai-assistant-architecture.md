# AI-Powered Personal Assistant — System Architecture

> **Stack:** Flutter (Mobile) · Node.js (Backend) · LangChain.js · Pinecone · PostgreSQL · Redis
> **Complexity:** Real-time voice streaming · RAG memory · Agentic tool calling · Offline-first · E2E encryption

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Layers](#2-architecture-layers)
   - [Layer 1 — Flutter Mobile App](#layer-1--flutter-mobile-app)
   - [Layer 2 — API Gateway](#layer-2--api-gateway)
   - [Layer 3 — Node.js Microservices](#layer-3--nodejs-microservices)
   - [Layer 4 — AI / ML Layer](#layer-4--ai--ml-layer)
   - [Layer 5 — Data & Storage](#layer-5--data--storage)
3. [Key Data Flows](#3-key-data-flows)
   - [Voice Query Flow](#31-voice-query-flow)
   - [RAG Memory Flow](#32-rag-memory-flow)
   - [Agentic Tool Flow](#33-agentic-tool-flow)
4. [Architecture Principles](#4-architecture-principles)
5. [Full Tech Stack](#5-full-tech-stack)
6. [Directory Structure](#6-directory-structure)
7. [Environment Variables](#7-environment-variables)
8. [Deployment Architecture](#8-deployment-architecture)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Flutter Mobile App                          │
│   Voice Input │ Chat UI │ AI Avatar │ Offline Store │ Push      │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                      API Gateway Layer                          │
│      Nginx │ Auth Service │ Rate Limiter │ WebSocket Gateway    │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Internal HTTP / gRPC
┌──────────────────────────▼──────────────────────────────────────┐
│                  Node.js Microservices                          │
│   AI Orchestrator │ Conversation Manager │ Tool Caller │ TTS    │
└────────┬────────────────┬───────────────────────────────────────┘
         │                │
┌────────▼──────┐  ┌──────▼──────────────────────────────────────┐
│  AI / ML Layer│  │           Data & Storage Layer               │
│  LLM │ Embed  │  │  PostgreSQL │ Pinecone │ Redis │ S3 │ BullMQ │
│  STT │ Vision │  └─────────────────────────────────────────────┘
└───────────────┘
```

The system is organized into **5 vertical layers**, each independently deployable and scalable. The Flutter app communicates exclusively through the API Gateway using HTTPS for REST calls and WSS (WebSocket Secure) for real-time streaming.

---

## 2. Architecture Layers

### Layer 1 — Flutter Mobile App

The mobile client is the sole user-facing surface. It is built **offline-first**, meaning all conversations are stored locally and synced to the backend when connectivity is available.

| Component | Technology | Responsibility |
|---|---|---|
| State Management | BLoC / Riverpod | Predictable, reactive UI state |
| Local Database | Drift (SQLite) | Offline conversation storage |
| Voice Input | `speech_to_text` + WebSocket | Captures audio, streams to backend |
| AI Avatar | Rive / Lottie | Animated avatar synced with TTS audio |
| Push Notifications | Firebase Cloud Messaging (FCM) | Background alerts and reminders |
| Secure Storage | `flutter_secure_storage` | JWT tokens, encryption keys |
| HTTP Client | Dio | REST calls with interceptors |
| WebSocket Client | `web_socket_channel` | Real-time streaming channel |

**Key Flutter packages:**
```yaml
dependencies:
  flutter_riverpod: ^2.x
  drift: ^2.x
  dio: ^5.x
  web_socket_channel: ^2.x
  speech_to_text: ^6.x
  flutter_secure_storage: ^9.x
  rive: ^0.12.x
  firebase_messaging: ^14.x
```

---

### Layer 2 — API Gateway

The gateway is the single entry point for all client traffic. It handles TLS termination, authentication, rate limiting, and WebSocket upgrades before proxying to the appropriate microservice.

| Component | Technology | Responsibility |
|---|---|---|
| Reverse Proxy | Nginx / Caddy | TLS termination, routing |
| Authentication | JWT + OAuth2 (Google, Apple) | Stateless auth with refresh tokens |
| Rate Limiter | Redis + `express-rate-limit` | Per-user request throttling |
| WebSocket Gateway | Socket.io | Persistent connections for streaming |
| Request Logging | Morgan + Winston | Access logs and tracing |

**Authentication flow:**
```
Client → [POST /auth/login] → Auth Service
       ← access_token (15min) + refresh_token (30 days)

Client → [Any API] → Gateway validates JWT
       → Decodes user_id, injects into request headers
       → Routes to microservice
```

---

### Layer 3 — Node.js Microservices

The backend is composed of focused, stateless services that communicate internally via HTTP or a shared message queue (BullMQ).

#### AI Orchestrator (`/services/orchestrator`)

The brain of the system. Built on **LangChain.js**, it receives a user message and coordinates everything: memory retrieval, tool selection, LLM calls, and response streaming.

```
User Message
     │
     ▼
[Orchestrator]
     │
     ├── 1. Retrieve memories (Pinecone)
     ├── 2. Build context window
     ├── 3. Call LLM with tools
     │        ├── Tool needed? → Tool Caller
     │        └── No tool? → Stream response
     └── 4. Extract & store new memory
```

#### Conversation Manager (`/services/conversation`)

Maintains the full message history per session in PostgreSQL. Enforces context window limits by summarizing old messages using the LLM.

#### Tool Caller (`/services/tools`)

Executes function calls decided by the LLM. Each tool is a registered handler:

| Tool | Description |
|---|---|
| `web_search` | DuckDuckGo / Serper API search |
| `get_weather` | OpenWeatherMap API |
| `calendar_read` | Google Calendar via OAuth |
| `calendar_write` | Create/update calendar events |
| `send_email` | Gmail via OAuth |
| `calculator` | Math expression evaluator |
| `code_runner` | Sandboxed JS/Python execution |

#### Memory Service (`/services/memory`)

Handles long-term memory as a two-step pipeline:
1. **Extract** — After each conversation turn, the LLM extracts memorable facts (name, preferences, recurring topics)
2. **Embed + Store** — Facts are embedded via OpenAI and upserted into Pinecone

#### TTS Service (`/services/tts`)

Bridges ElevenLabs (or OpenAI TTS) for voice synthesis. Caches frequently used phrases in Redis to reduce API costs and latency.

---

### Layer 4 — AI / ML Layer

External AI providers consumed via REST APIs. All calls are routed through the AI Orchestrator.

| Service | Provider | Use Case |
|---|---|---|
| LLM | GPT-4o / Claude 3.5 | Reasoning, response generation, tool use |
| Embeddings | OpenAI `text-embedding-3-small` | Memory encoding for RAG |
| STT | OpenAI Whisper | Voice-to-text transcription |
| TTS | ElevenLabs / OpenAI TTS | Text-to-speech synthesis |
| Vision | GPT-4o (vision) | Image understanding from camera/uploads |

**LLM Context Window Strategy:**

```
System Prompt (fixed)
       +
Long-Term Memories (top-5 from Pinecone, ~500 tokens)
       +
Conversation Summary (if history > 10 turns, ~300 tokens)
       +
Recent Messages (last 6 turns, ~1,200 tokens)
       +
Current User Message
─────────────────────────────
Total Target: < 4,096 tokens (GPT-3.5) / < 16,384 tokens (GPT-4o)
```

---

### Layer 5 — Data & Storage

| Store | Technology | Data Stored |
|---|---|---|
| Primary DB | PostgreSQL (via Prisma) | Users, sessions, messages, tools log |
| Vector DB | Pinecone | Embedded memory vectors |
| Cache | Redis | Sessions, TTS cache, rate limit counters |
| Object Storage | AWS S3 / Cloudflare R2 | Audio files, uploaded images |
| Job Queue | BullMQ (Redis-backed) | Async jobs: memory extraction, email sends |

**PostgreSQL Schema (simplified):**

```sql
users          (id, email, name, oauth_provider, created_at)
conversations  (id, user_id, title, summary, created_at, updated_at)
messages       (id, conversation_id, role, content, tokens, created_at)
memories       (id, user_id, content, vector_id, created_at)
tool_calls     (id, message_id, tool_name, input, output, duration_ms)
```

---

## 3. Key Data Flows

### 3.1 Voice Query Flow

The most latency-sensitive path in the system. Target end-to-end latency: **< 800ms** to first audio chunk.

```
1.  User speaks           → Flutter records audio (PCM/16kHz)
2.  Audio streaming       → WebSocket chunks sent to Node.js
3.  STT transcription     → Whisper API converts speech → text
4.  Message dispatched    → AI Orchestrator receives text
5.  Memory retrieval      → Pinecone top-5 similarity search
6.  LLM call (streaming)  → GPT-4o streams tokens back
7.  Token relay           → Node.js relays tokens via WebSocket
8.  TTS synthesis         → ElevenLabs converts text → audio stream
9.  Avatar animation      → Flutter animates Rive avatar to audio
10. Memory extraction     → Background job stores new facts
```

**Latency breakdown (target):**

| Step | Target |
|---|---|
| Audio capture → STT | ~300ms |
| STT → LLM first token | ~200ms |
| LLM first token → TTS first chunk | ~150ms |
| TTS first chunk → Flutter playback | ~100ms |
| **Total to first audio** | **< 800ms** |

---

### 3.2 RAG Memory Flow

Gives the assistant long-term contextual memory across sessions.

```
1.  User message arrives      → Orchestrator receives text
2.  Embedding generated       → OpenAI embeds message (1536-dim vector)
3.  Pinecone similarity query → Top-5 most relevant memories retrieved
4.  Context injection         → Memories prepended to LLM system prompt
5.  LLM generates response    → With enriched personal context
6.  Memory extraction         → LLM identifies new memorable facts
7.  New facts embedded        → OpenAI embeds extracted memories
8.  Pinecone upsert           → New vectors stored with user_id metadata
9.  PostgreSQL log            → Raw memory text saved for audit
```

**Example memory entries stored in Pinecone:**
```
"User's name is Alex and they prefer concise responses"
"User is a Flutter developer building a fintech app"
"User's timezone is America/New_York"
"User dislikes being asked clarifying questions"
```

---

### 3.3 Agentic Tool Flow

Enables the assistant to take real actions, not just generate text.

```
1.  User request              → "Schedule a meeting with John tomorrow at 3pm"
2.  LLM decides to use tool   → Outputs function_call: calendar_write
3.  Tool Caller invoked       → Parses function schema and arguments
4.  External API call         → Google Calendar API creates event
5.  Tool result returned      → Success/failure JSON back to LLM
6.  LLM continues reasoning   → Incorporates result into response
7.  Final answer streamed     → "Done! I've added the meeting to your calendar."
8.  Job logged in BullMQ      → For retry if the API call failed
9.  Audit record saved        → tool_calls table in PostgreSQL
```

**Tool call structure (LangChain.js):**
```javascript
const tools = [
  new DynamicTool({
    name: "calendar_write",
    description: "Create or update a calendar event. Input: JSON with title, date, time, attendees.",
    func: async (input) => {
      const event = JSON.parse(input);
      return await googleCalendarService.createEvent(event);
    },
  }),
];
```

---

## 4. Architecture Principles

### Offline-First
- Drift (SQLite) stores all conversations locally on device
- Flutter syncs with backend on reconnect using a timestamp-based merge strategy
- Users can read and search conversation history with zero network connectivity

### End-to-End Encryption
- Messages are encrypted client-side using AES-256-GCM before transmission
- Encryption keys are stored in the device's Secure Enclave (iOS) or Android Keystore
- The backend stores and relays ciphertext only — it never sees plaintext messages

### Streaming by Default
- LLM tokens are streamed via WebSocket as they are generated (not buffered)
- Voice audio is chunked and streamed for sub-second playback start
- Flutter renders tokens progressively using a `StreamBuilder`

### Horizontally Scalable
- All Node.js services are stateless — session state lives in Redis
- BullMQ handles async work, allowing services to scale independently
- Pinecone and PostgreSQL handle their own replication and read scaling

### Resilient by Design
- BullMQ provides automatic retry with exponential backoff for all async jobs
- Circuit breakers (via `opossum`) protect against LLM/external API outages
- Graceful degradation: if Pinecone is unavailable, the assistant continues without long-term memory

---

## 5. Full Tech Stack

### Flutter (Mobile)
| Package | Version | Purpose |
|---|---|---|
| `flutter_riverpod` | ^2.x | State management |
| `drift` | ^2.x | Local SQLite ORM |
| `dio` | ^5.x | HTTP client |
| `web_socket_channel` | ^2.x | WebSocket |
| `speech_to_text` | ^6.x | Voice input |
| `flutter_secure_storage` | ^9.x | Secure key storage |
| `rive` | ^0.12.x | Avatar animation |
| `firebase_messaging` | ^14.x | Push notifications |

### Node.js (Backend)
| Package | Version | Purpose |
|---|---|---|
| `fastify` | ^4.x | HTTP server |
| `socket.io` | ^4.x | WebSocket server |
| `langchain` | ^0.x | AI orchestration |
| `@prisma/client` | ^5.x | PostgreSQL ORM |
| `bullmq` | ^4.x | Job queue |
| `ioredis` | ^5.x | Redis client |
| `zod` | ^3.x | Schema validation |
| `winston` | ^3.x | Logging |
| `opossum` | ^7.x | Circuit breaker |

### AI / ML
| Service | Model | Use |
|---|---|---|
| OpenAI | `gpt-4o` | Primary LLM |
| Anthropic | `claude-3-5-sonnet` | Fallback LLM |
| OpenAI | `text-embedding-3-small` | Embeddings |
| OpenAI | `whisper-1` | Speech-to-text |
| ElevenLabs | `eleven_turbo_v2` | Text-to-speech |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local development |
| Kubernetes (EKS / GKE) | Production orchestration |
| GitHub Actions | CI/CD pipeline |
| Nginx | Reverse proxy + TLS |
| Terraform | Infrastructure as code |
| Grafana + Prometheus | Metrics and dashboards |
| Sentry | Error tracking |

---

## 6. Directory Structure

```
ai-assistant/
│
├── mobile/                          # Flutter app
│   ├── lib/
│   │   ├── core/
│   │   │   ├── auth/                # JWT handling, OAuth
│   │   │   ├── network/             # Dio client, WebSocket
│   │   │   └── storage/             # Drift DB, secure storage
│   │   ├── features/
│   │   │   ├── chat/                # Chat UI, BLoC
│   │   │   ├── voice/               # Voice input, audio player
│   │   │   ├── avatar/              # Rive avatar controller
│   │   │   └── settings/            # User preferences
│   │   └── main.dart
│   └── pubspec.yaml
│
├── backend/                         # Node.js services
│   ├── services/
│   │   ├── gateway/                 # Nginx config, auth middleware
│   │   ├── orchestrator/            # LangChain.js AI orchestration
│   │   ├── conversation/            # Message history management
│   │   ├── memory/                  # RAG memory pipeline
│   │   ├── tools/                   # Tool definitions + handlers
│   │   └── tts/                     # Text-to-speech bridge
│   ├── shared/
│   │   ├── db/                      # Prisma schema + migrations
│   │   ├── queue/                   # BullMQ job definitions
│   │   ├── cache/                   # Redis helpers
│   │   └── types/                   # Shared TypeScript types
│   └── package.json
│
├── infra/                           # Infrastructure as code
│   ├── terraform/
│   ├── k8s/
│   └── docker-compose.yml
│
└── docs/
    └── architecture.md              # This document
```

---

## 7. Environment Variables

```bash
# ── AI Providers ──────────────────────────────────────────
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...

# ── Vector DB ─────────────────────────────────────────────
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=assistant-memories

# ── Databases ─────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/assistant
REDIS_URL=redis://localhost:6379

# ── Object Storage ────────────────────────────────────────
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=assistant-audio

# ── Auth ──────────────────────────────────────────────────
JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ── App ───────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=3001
```

---

## 8. Deployment Architecture

```
                        ┌─────────────────┐
                        │   Cloudflare    │  (DNS, DDoS, CDN)
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Load Balancer  │  (AWS ALB / GCP LB)
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼───────┐ ┌────────▼───────┐ ┌────────▼───────┐
     │  Gateway Pod 1 │ │  Gateway Pod 2 │ │  Gateway Pod 3 │
     └────────┬───────┘ └────────┬───────┘ └────────┬───────┘
              │                  │                  │
     ┌────────▼──────────────────▼──────────────────▼───────┐
     │              Kubernetes Internal Network              │
     │                                                       │
     │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
     │  │ Orchestrator│  │ Conversation │  │    Memory   │  │
     │  │  (3 pods)   │  │  (2 pods)    │  │  (2 pods)   │  │
     │  └─────────────┘  └──────────────┘  └─────────────┘  │
     │                                                       │
     │  ┌─────────────┐  ┌──────────────┐                   │
     │  │    Tools    │  │     TTS      │                   │
     │  │  (2 pods)   │  │  (2 pods)    │                   │
     │  └─────────────┘  └──────────────┘                   │
     └───────────────────────────────────────────────────────┘
              │                  │                  │
     ┌────────▼───────┐ ┌────────▼───────┐ ┌────────▼───────┐
     │  PostgreSQL    │ │  Redis Cluster │ │   Pinecone     │
     │  (RDS / Cloud) │ │  (ElastiCache) │ │   (Managed)    │
     └────────────────┘ └────────────────┘ └────────────────┘
```

**CI/CD Pipeline (GitHub Actions):**

```
Push to main
     │
     ├── Lint & Type Check
     ├── Unit Tests
     ├── Integration Tests (Docker Compose)
     ├── Build Docker Images
     ├── Push to Container Registry (ECR / GCR)
     └── Deploy to Kubernetes (kubectl apply)
              ├── Rolling update (zero downtime)
              └── Smoke tests → notify Slack
```

---

*Last updated: June 2026 · Flutter 3.x · Node.js 20.x LTS*
