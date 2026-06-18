# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Pre-implementation.** Only the architecture spec exists (`ai-assistant-architecture.md`). Source code directories (`mobile/`, `backend/`, `infra/`) do not yet exist. When implementing, follow the spec closely.

## Planned Structure

```
mobile/          # Flutter app (Dart)
backend/         # Node.js microservices (TypeScript)
infra/           # Terraform + k8s + docker-compose.yml
```

## Flutter App (`mobile/`)

Use `fvm flutter` / `fvm dart` (FVM manages SDK). See global CLAUDE.md for aliases (`fvpg`, `fgc`, etc.).

State management: **Riverpod** (not BLoC). Local DB: **Drift** (SQLite). HTTP: **Dio**. WebSocket: `web_socket_channel`.

Run/build commands (once scaffolded):
```bash
fvm flutter pub get
fvm flutter run
fvm dart run build_runner build -d   # after modifying @freezed / codegen files
```

## Node.js Backend (`backend/`)

Each service under `backend/services/` is stateless. Shared utilities in `backend/shared/`.

```bash
npm install
npm run dev        # local dev
npm test           # unit tests
npm run db:migrate # prisma migrate dev
```

TypeScript throughout. Validate all external inputs with **Zod**. Log via **Winston**. Circuit-break external AI/API calls with **opossum**.

## Architecture Decisions (non-obvious)

**E2E encryption**: Messages encrypted AES-256-GCM on-device. Backend stores ciphertext only — never decrypt server-side.

**RAG memory pipeline** (Memory Service):
1. After each turn, LLM extracts facts → embed via `text-embedding-3-small` → upsert to Pinecone
2. On next turn, embed user message → top-5 Pinecone similarity → inject into system prompt

**Context window budget** (Orchestrator):
- System prompt + top-5 memories (~500 tokens) + conversation summary if >10 turns (~300 tokens) + last 6 messages (~1,200 tokens)
- Target total: <4,096 tokens for GPT-3.5, <16,384 for GPT-4o

**Voice latency target**: <800ms to first audio chunk. STT (Whisper) → LLM (streaming) → TTS (ElevenLabs `eleven_turbo_v2`) pipeline must not buffer — stream each stage directly via WebSocket.

**Offline-first sync**: Drift stores all conversations locally. On reconnect, sync uses timestamp-based merge. Never block UI on network.

**Tool retry**: All tool calls dispatched via BullMQ with exponential backoff. Audit logged to `tool_calls` table.

**LLM fallback**: GPT-4o primary → Claude Sonnet fallback. Orchestrator must handle both via LangChain.js abstraction.

## Key Services

| Service | Path | Role |
|---|---|---|
| Orchestrator | `backend/services/orchestrator` | LangChain.js — memory retrieval, tool dispatch, LLM streaming |
| Conversation | `backend/services/conversation` | PostgreSQL message history + context window summarization |
| Memory | `backend/services/memory` | RAG pipeline — fact extraction, embedding, Pinecone upsert |
| Tools | `backend/services/tools` | Executes: web_search, weather, calendar_read/write, send_email, calculator, code_runner |
| TTS | `backend/services/tts` | ElevenLabs/OpenAI TTS bridge; caches phrases in Redis |
| Gateway | `backend/services/gateway` | Nginx, JWT auth, Socket.io WebSocket, rate limiting (Redis) |

## Required Environment Variables

```bash
# AI
OPENAI_API_KEY
ANTHROPIC_API_KEY
ELEVENLABS_API_KEY

# Vector DB
PINECONE_API_KEY
PINECONE_ENVIRONMENT
PINECONE_INDEX_NAME   # assistant-memories

# Data
DATABASE_URL          # postgresql://...
REDIS_URL

# Storage
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET_NAME

# Auth
JWT_SECRET
JWT_EXPIRES_IN        # 15m
JWT_REFRESH_EXPIRES_IN # 30d
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# App
PORT                  # 3000
WEBSOCKET_PORT        # 3001
```

## Prisma Schema (core tables)

```sql
users          (id, email, name, oauth_provider, created_at)
conversations  (id, user_id, title, summary, created_at, updated_at)
messages       (id, conversation_id, role, content, tokens, created_at)
memories       (id, user_id, content, vector_id, created_at)
tool_calls     (id, message_id, tool_name, input, output, duration_ms)
```

## Local Development

```bash
# Start all services
docker-compose -f infra/docker-compose.yml up

# Run Prisma migrations
cd backend && npx prisma migrate dev

# Flutter
cd mobile && fvm flutter run
```
