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
cp .env.example .env       # fill in API keys
npm install
docker compose -f ../infra/docker-compose.yml up -d   # postgres + redis
npm run db:migrate
npm run dev
```

### Flutter

```bash
cd mobile
fvm flutter pub get
fvm flutter run
```

## Environment Variables

See `backend/.env.example` for all required variables (AI providers, database URLs, auth secrets, etc.).
