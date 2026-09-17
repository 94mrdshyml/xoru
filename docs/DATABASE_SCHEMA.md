# DATABASE_SCHEMA.md — Neon DB Models & RLS Multi-Tenancy Blueprint

**Tagline**: *Short Link. Real Intelligence.*

This document specifies the database models, primary key prefixing scheme, Neon Postgres Row-Level Security (RLS) policies, and database procedures for **Xoru**.

---

## 1. ID Prefixing Scheme

All primary keys use a **Stripe-style prefixed ID**: `{prefix}_{24-char nanoid}`. Auto-increment integers are strictly prohibited.

| Prefix | Entity Table | Example ID |
| :--- | :--- | :--- |
| `wrk_` | `workspaces` (Workspace ID) | `wrk_1a2b3c4d5e6f7g8h9i0j1k2l` |
| `usr_` | `users` (Clerk User ID) | `usr_9f8e7d6c5b4a3z2y1x0w9v8u` |
| `lnk_` | `links` | `lnk_3a4b5c6d7e8f9g0h1i2j3k4l` |
| `srt_` | `smart_routes` | `srt_5b6c7d8e9f0g1h2i3j4k5l6m` |
| `pxl_` | `retargeting_pixels` | `pxl_7c8d9e0f1g2h3i4j5k6l7m8n` |
| `evt_` | `click_events` | `evt_0a9b8c7d6e5f4g3h2i1j0k9l` |
| `key_` | `api_keys` | `key_1z2y3x4w5v6u7t8s9r0q1p2o` |

---

## 2. User & Workspace Hierarchy

Xoru uses a multi-tenant hierarchy where **every workspace belongs to a user**, and a **user can have multiple workspaces**:

```
User (usr_xxx) — Top-Level Tenant (Clerk User ID)
  ├── Workspace A (wrk_xxx) — e.g. "John's Workspace"
  │     ├── Short Links (lnk_xxx)
  │     ├── Smart Routes (srt_xxx)
  │     └── Analytics Events (evt_xxx)
  └── Workspace B (wrk_xxx) — e.g. "Side Project Workspace"
        └── Short Links (lnk_xxx)
```

---

## 3. Table Schemas

### Table 1: `workspaces`
Stores workspace environments owned by a user.

```sql
CREATE TABLE workspaces (
    id VARCHAR(64) PRIMARY KEY, -- wrk_xxx
    user_id VARCHAR(64) NOT NULL, -- usr_xxx (Clerk User ID)
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
```

### Table 2: `links`
Stores short link configurations.

```sql
CREATE TABLE links (
    id VARCHAR(64) PRIMARY KEY, -- lnk_xxx
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    destination_url TEXT NOT NULL,
    short_code VARCHAR(32) UNIQUE NOT NULL,
    custom_slug VARCHAR(128) UNIQUE,
    redirect_type INT NOT NULL DEFAULT 301,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_workspace_id ON links(workspace_id);
CREATE INDEX idx_links_short_code ON links(short_code);
```

---

## 4. Neon Postgres Row-Level Security (RLS)

Every database session sets `SET LOCAL app.current_tenant_id = '<clerk_user_id>'` within transaction blocks. Row-Level Security policies automatically restrict queries to rows where `user_id` matches the session setting.

```sql
CREATE POLICY tenant_isolation_workspaces ON workspaces FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
CREATE POLICY tenant_isolation_links ON links FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
CREATE POLICY tenant_isolation_smart_routes ON smart_routes FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
CREATE POLICY tenant_isolation_retargeting_pixels ON retargeting_pixels FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
CREATE POLICY tenant_isolation_click_events ON click_events FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
```
