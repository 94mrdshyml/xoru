# ARCHITECTURE.md — Xoru System Architecture & Edge Topology

**Tagline**: *Short Link. Real Intelligence.*

This document details the high-level architecture, deployment topology, edge caching mechanics, authentication pipeline, and database multi-tenancy model for **Xoru**.

---

## 1. System Topology Overview

```mermaid
flowchart TD
    Visitor[End-User / Visitor] -->|1. Short Link Request| CF_Edge[Cloudflare Global Edge]
    DashboardUser[Dashboard User / Admin] -->|2. Web App Requests| CF_Edge

    subgraph Cloudflare Infrastructure
        CF_Edge -->|Short Link Lookup| Worker_BE["xoru-backend (Python Worker)"]
        CF_Edge -->|Next.js App Router| Worker_FE["xoru-frontend (Next.js Worker)"]
        
        Worker_BE <-->|Sub-10ms Lookup / Sync| CF_KV[(Cloudflare KV Cache)]
    end

    subgraph Auth & Identity (Clerk)
        Worker_FE <-->|User Auth / Org Switcher| Clerk[Clerk Auth Services]
        Worker_BE <-->|JWT Verification / Org Claim| Clerk
    end

    subgraph Relational Database (Neon Postgres)
        Worker_BE -->|Pooled SQL Queries| Neon[(Neon Serverless DB)]
        Neon -->|Row Level Security| RLS_Policies["RLS Tenant Isolation (app.current_tenant_id)"]
        Neon -->|Click Logging| Click_Events[click_events Table]
    end

    subgraph Future Analytics Pipeline
        Neon -.->|Future Migration| Tinybird[(Tinybird Analytics)]
    end
```

---

## 2. Component Boundaries & Responsibilities

### A. Frontend Worker (`apps/frontend`)
- **Framework**: Next.js App Router deployed to Cloudflare Workers (`xoru-frontend`).
- **Role**: Serves the user dashboard, link creation modal, analytics graphs, QR code generator, and workspace configuration UI.
- **Brand & UI**: Styled with Tailwind CSS, Open Sans font, Lucide icons, Indigo brand palette (`#4F46E5`), and state morphing micro-interactions specified in [`docs/DESIGN.md`](file:///c:/vibe%20coding/xoru/docs/DESIGN.md).
- **Authentication**: Integrates `@clerk/nextjs` for session management and Organization switching.

### B. Backend Worker (`apps/backend`)
- **Framework**: Python Worker (FastAPI / Workers Python runtime via Pyodide).
- **Role**: Handles short link redirection, dynamic routing rules evaluation (Device / Geo / A/B split), link CRUD operations, and click event tracking.
- **Edge Cache Invalidation**: Writing or updating a link writes to Neon DB and immediately updates Cloudflare KV.

### C. Edge Redirection Engine (Cloudflare KV)
- **Role**: Sub-10ms short link redirection.
- **Cache Hit Path**: 
  1. Incoming GET request for `/a9x2k` arrives at `xoru-backend`.
  2. Worker queries Cloudflare KV key `lnk:a9x2k`.
  3. If found, returns 301/302 Redirect header immediately (<10ms).
- **Cache Miss Fallback**:
  1. On KV miss, Worker queries Neon DB `links` table.
  2. Populates KV cache asynchronously for subsequent global requests.

### D. Relational Storage (Neon Postgres + RLS)
- **Role**: Multi-tenant relational storage for Workspaces, Users, Short Links, Smart Routes, Retargeting Pixels, and Click Analytics.
- **Isolation**: Enforced via Postgres Row-Level Security (RLS) policies driven by Clerk Organization ID (`org_xxx`).

---

## 3. Request Flow Pipelines

### A. Short Link Creation Pipeline
```
Dashboard UI → Clerk JWT Token → POST /api/links → Backend JWT Verification → 
Begin Transaction → SET LOCAL app.current_tenant_id = 'org_xxx' → 
INSERT INTO links → Commit → Sync to Cloudflare KV (`lnk:<short_code>`) → 201 Created
```

### B. Visitor Redirect & Intelligence Pipeline
```
Visitor Request GET /a9x2k → CF Worker Edge → Check CF KV → 
[HIT]: Evaluate Smart Rules (Device OS / Geo ISO) → Record Click Event in Neon (Async) → HTTP 301/302 Redirect
[MISS]: Query Neon DB → Populate KV → Evaluate Smart Rules → Record Click → HTTP 301/302 Redirect
```

---

## 4. Latency Budget & SLA Targets

- **Edge Redirection (KV Hit)**: `< 10ms` globally.
- **Dashboard API Responses**: `< 150ms` (Neon pooled HTTP connections).
- **UI Interaction Feedbacks**: `< 100ms` button state morph transition.

