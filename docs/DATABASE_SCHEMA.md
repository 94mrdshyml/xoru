# DATABASE_SCHEMA.md — Neon DB Models & RLS Multi-Tenancy Blueprint

**Tagline**: *Short Link. Real Intelligence.*

This document specifies the database models, primary key prefixing scheme, Neon Postgres Row-Level Security (RLS) policies, and Alembic migration procedures for **Xoru**.

---

## 1. ID Prefixing Scheme

All primary keys use a **Stripe-style prefixed ID**: `{prefix}_{24-char nanoid}`. Auto-increment integers are strictly prohibited.

| Prefix | Entity Table | Example ID |
| :--- | :--- | :--- |
| `org_` | `workspaces` (Clerk Org ID) | `org_2k9x8a7b6c5d4e3f2g1h0i9j` |
| `usr_` | `users` (Clerk User ID) | `usr_1a2b3c4d5e6f7g8h9i0j1k2l` |
| `lnk_` | `links` | `lnk_9f8e7d6c5b4a3z2y1x0w9v8u` |
| `srt_` | `smart_routes` | `srt_3a4b5c6d7e8f9g0h1i2j3k4l` |
| `pxl_` | `retargeting_pixels` | `pxl_5b6c7d8e9f0g1h2i3j4k5l6m` |
| `evt_` | `click_events` | `evt_7c8d9e0f1g2h3i4j5k6l7m8n` |
| `key_` | `api_keys` | `key_0a9b8c7d6e5f4g3h2i1j0k9l` |

---

## 2. Table Schemas

### Table 1: `workspaces`
Stores tenant organization metadata mapped from Clerk.

```sql
CREATE TABLE workspaces (
    id VARCHAR(32) PRIMARY KEY, -- org_xxx
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 2: `links` (Tenant Scoped)
Stores short links with support for auto-generated codes and custom slugs.

```sql
CREATE TABLE links (
    id VARCHAR(32) PRIMARY KEY, -- lnk_xxx
    tenant_id VARCHAR(32) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    destination_url TEXT NOT NULL,
    short_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'a9x2k'
    custom_slug VARCHAR(128) UNIQUE,        -- e.g. 'launch-event' (optional)
    redirect_type INT NOT NULL DEFAULT 301,  -- 301 (Permanent) or 302 (Temporary)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_by VARCHAR(32) NOT NULL,        -- usr_xxx
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_links_tenant_id ON links(tenant_id);
CREATE INDEX idx_links_short_code ON links(short_code);
CREATE INDEX idx_links_custom_slug ON links(custom_slug) WHERE custom_slug IS NOT NULL;
```

### Table 3: `smart_routes` (Phase 5 Feature)
Stores dynamic redirection rules (device OS, geo country ISO, A/B weight).

```sql
CREATE TABLE smart_routes (
    id VARCHAR(32) PRIMARY KEY, -- srt_xxx
    link_id VARCHAR(32) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    tenant_id VARCHAR(32) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    rule_type VARCHAR(32) NOT NULL, -- 'device', 'geo', 'ab_test'
    rule_condition JSONB NOT NULL,  -- e.g. {"device": "ios"} or {"country": "US"}
    target_url TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_smart_routes_link_id ON smart_routes(link_id);
```

### Table 4: `retargeting_pixels` (Phase 5 Feature)
Stores ad tracking pixel snippets attached to short links.

```sql
CREATE TABLE retargeting_pixels (
    id VARCHAR(32) PRIMARY KEY, -- pxl_xxx
    link_id VARCHAR(32) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    tenant_id VARCHAR(32) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL, -- 'facebook', 'google', 'tiktok', 'custom'
    pixel_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 5: `click_events` (Neon DB Basic Analytics)
Log table recording visitor click events.

```sql
CREATE TABLE click_events (
    id VARCHAR(32) PRIMARY KEY, -- evt_xxx
    tenant_id VARCHAR(32) NOT NULL,
    link_id VARCHAR(32) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country VARCHAR(8),         -- ISO 3166-1 alpha-2 (e.g. 'US', 'IN')
    city VARCHAR(128),
    device_type VARCHAR(32),    -- 'mobile', 'desktop', 'tablet'
    browser VARCHAR(64),
    os VARCHAR(64),
    referrer TEXT,
    ip_hash VARCHAR(64) NOT NULL -- Anonymized SHA256 hash of visitor IP
);

CREATE INDEX idx_click_events_link_time ON click_events(link_id, timestamp DESC);
CREATE INDEX idx_click_events_tenant_time ON click_events(tenant_id, timestamp DESC);
```

---

## 3. Neon Row-Level Security (RLS) Policies

Multi-tenancy isolation is enforced directly at the Postgres engine level.

### Step 1: Enable RLS on Tenant Tables
```sql
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
```

### Step 2: Define Isolation Policies
```sql
-- Links Policy
CREATE POLICY tenant_isolation_links ON links
    FOR ALL
    USING (tenant_id = CURRENT_SETTING('app.current_tenant_id', true));

-- Click Events Policy
CREATE POLICY tenant_isolation_click_events ON click_events
    FOR ALL
    USING (tenant_id = CURRENT_SETTING('app.current_tenant_id', true));
```

### Step 3: Application Code Standard (Python Backend)
```python
# Every query execution MUST run within a transaction context setting tenant ID:
async with db.transaction():
    await db.execute("SET LOCAL app.current_tenant_id = :tenant_id", {"tenant_id": clerk_org_id})
    result = await db.fetch_all("SELECT * FROM links")
```

---

## 4. Migration Protocol (Alembic)

- **Generate Migration**:
  ```bash
  alembic revision --autogenerate -m "create_links_and_rls_policies"
  ```
- **Apply Migration**:
  ```bash
  alembic upgrade head
  ```
- **Rule**: Never run destructive raw SQL against production without explicit approval.

