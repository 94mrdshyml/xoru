# Xoru — Short Link. Real Intelligence.

[![CI Pipeline](https://github.com/94mrdshyml/xoru/actions/workflows/ci.yml/badge.svg)](https://github.com/94mrdshyml/xoru/actions/workflows/ci.yml)
[![Deploy Workers](https://github.com/94mrdshyml/xoru/actions/workflows/deploy.yml/badge.svg)](https://github.com/94mrdshyml/xoru/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Xoru is a high-performance, multi-tenant link shortening and intelligence platform designed for speed, security, and smart dynamic routing. Built with Next.js, Python Workers, Neon Postgres RLS, and Cloudflare KV.

---

## ⚡ Key Capabilities

- **Sub-10ms Edge Redirects**: Global link lookups served directly from Cloudflare KV edge cache.
- **Multi-Tenant Isolation**: Secured with Clerk Authentication and Neon DB Row-Level Security (RLS).
- **Short Link Flexibility**: Provisions both auto-generated unique codes (`/a9x2k`) and custom slugs (`/launch`).
- **Real Intelligence & Smart Routing**: Dynamic redirection based on visitor device (iOS/Android/Desktop), geo-location (Country), and A/B traffic split weights.
- **Click Analytics**: Neon DB click logging with real-time aggregation views (Tinybird migration ready).
- **Anti-Slop Modern UI**: Indigo primary brand theme (`#4F46E5`), Open Sans typography, interactive QR code generator, and fluid state morphing micro-interactions.

---

## 🏗️ Tech Stack & Architecture

- **Frontend Worker (`apps/frontend`)**: Next.js App Router deployed to Cloudflare Workers (`xoru-frontend`).
- **Backend Worker (`apps/backend`)**: Python (FastAPI / Workers Python runtime) deployed to Cloudflare Workers (`xoru-backend`).
- **Database (`packages/db`)**: Neon Serverless Postgres DB with Alembic migrations & RLS policies.
- **Authentication**: Clerk (Multi-Tenant Org ID mapped to `tenant_id`).
- **Edge Cache**: Cloudflare KV.
- **Design System**: Indigo brand theme, Open Sans typography, Lucide Icons, Taste Skill + Impeccable guidelines.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js `^18.18.0` or `^20.0.0`
- Python `^3.10`
- `npm` package manager
- Cloudflare Wrangler CLI (`npm i -g wrangler`)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/94mrdshyml/xoru.git
   cd xoru
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in both `apps/frontend` and `apps/backend`:
   ```bash
   # Frontend (.env)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8787

   # Backend (.env)
   NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/xoru_db?sslmode=require
   CLERK_SECRET_KEY=sk_test_...
   CLOUDFLARE_KV_NAMESPACE_ID=xxx
   ```

4. **Run Local Development Servers**:
   ```bash
   # Start Next.js frontend worker
   npm run dev --workspace=apps/frontend

   # Start Python backend worker
   npm run dev --workspace=apps/backend
   ```

---

## 🧪 Testing & Code Quality

```bash
# Run TypeScript & Python type checking
npm run typecheck

# Run ESLint & Ruff linters
npm run lint

# Run Backend Pytest suite
npm run test:backend

# Run Frontend Vitest suite
npm run test:frontend
```

---

## 📖 Documentation Directory

- [`docs/ARCHITECTURE.md`](file:///c:/vibe%20coding/xoru/docs/ARCHITECTURE.md) — System design & Cloudflare Workers edge architecture
- [`docs/DATABASE_SCHEMA.md`](file:///c:/vibe%20coding/xoru/docs/DATABASE_SCHEMA.md) — Neon DB schema blueprint, RLS security policies, and migration rules
- [`docs/DESIGN.md`](file:///c:/vibe%20coding/xoru/docs/DESIGN.md) — Design system specification, Indigo brand guidelines, typography, and button morphing state transitions
- [`docs/API_SPEC.md`](file:///c:/vibe%20coding/xoru/docs/API_SPEC.md) — REST API endpoint specs & schemas
- [`docs/CI_CD_WORKFLOW.md`](file:///c:/vibe%20coding/xoru/docs/CI_CD_WORKFLOW.md) — GitHub Actions pipeline & automated agent watch protocol
- [`docs/SESSION_LOG.md`](file:///c:/vibe%20coding/xoru/docs/SESSION_LOG.md) — Living session history log (IST timestamps)

---

## 📜 License

Distributed under the MIT License.

