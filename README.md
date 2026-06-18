# AI Personal Assistant

Voice-first AI assistant with persistent memory, real-time streaming, and agentic tool calling.

**Stack:** Flutter (iOS + Android) · Node.js + Express · LangChain.js · PostgreSQL · Redis · Pinecone

See [`docs/ai-assistant-architecture.md`](docs/ai-assistant-architecture.md) for full system design.

---

## Structure

```
mobile/      Flutter app (Dart, Riverpod, Drift)
backend/     Node.js services (TypeScript, Express)
infra/       Docker Compose, Kubernetes manifests, Terraform
docs/        Architecture and decision documents
```

## Local Setup

### Prerequisites

- [FVM](https://fvm.app) for Flutter SDK management
- Node.js 20 LTS
- Docker + Docker Compose

### Backend

```bash
cd backend
cp .env.example .env
# ⚠️  Edit .env now — set POSTGRES_PASSWORD, REDIS_PASSWORD, DATABASE_URL,
#     REDIS_URL, and JWT_SECRET before continuing. See .env.example comments.
npm install
docker compose -f ../infra/docker-compose.yml --env-file .env up -d
npm run db:migrate
npm run dev
```

> `--env-file .env` is required — Docker Compose reads passwords from it to
> initialise Postgres and Redis. Without it the containers fail to start.
>
> Generate a secure `JWT_SECRET` with: `openssl rand -base64 32`
>
> Never commit `.env` — it is gitignored.

### Flutter

```bash
cd mobile
fvm flutter pub get
fvm flutter run
```

## Environment Variables

See `backend/.env.example` for all required variables (AI providers, database URLs, auth secrets, etc.).
