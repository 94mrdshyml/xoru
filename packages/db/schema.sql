-- ==============================================================================
-- XORU DATABASE SCHEMA & NEON ROW-LEVEL SECURITY (RLS) POLICIES
-- Tagline: Short Link. Real Intelligence.
-- Architecture: User -> Workspaces -> Short Links
-- ==============================================================================

-- Drop legacy table if exists
DROP TABLE IF EXISTS organizations CASCADE;

-- 1. Workspaces Table (Belongs to a User: 1 User -> N Workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY, -- wrk_xxx
    user_id VARCHAR(64) NOT NULL, -- usr_xxx (Clerk User ID)
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

-- 2. Short Links Table
CREATE TABLE IF NOT EXISTS links (
    id VARCHAR(64) PRIMARY KEY, -- lnk_xxx
    user_id VARCHAR(64) NOT NULL, -- usr_xxx (Clerk User ID)
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL,
    short_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. 'a9x2k'
    custom_slug VARCHAR(128) UNIQUE,        -- e.g. 'launch-event'
    redirect_type INT NOT NULL DEFAULT 301,  -- 301 (Permanent) or 302 (Temporary)
    password_hash VARCHAR(255),
    password_salt VARCHAR(64),
    is_one_time BOOLEAN NOT NULL DEFAULT FALSE,
    is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    consumed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_by VARCHAR(64) NOT NULL,        -- usr_xxx
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_workspace_id ON links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug) WHERE custom_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at) WHERE expires_at IS NOT NULL;

-- 3. Smart Dynamic Routes Table
CREATE TABLE IF NOT EXISTS smart_routes (
    id VARCHAR(64) PRIMARY KEY, -- srt_xxx
    link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    rule_type VARCHAR(32) NOT NULL, -- 'device', 'geo', 'ab_test'
    rule_condition JSONB NOT NULL,  -- e.g. {"device": "ios"} or {"country": "US"}
    target_url TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_routes_link_id ON smart_routes(link_id);
CREATE INDEX IF NOT EXISTS idx_smart_routes_user_id ON smart_routes(user_id);

-- 4. Retargeting Pixels Table
CREATE TABLE IF NOT EXISTS retargeting_pixels (
    id VARCHAR(64) PRIMARY KEY, -- pxl_xxx
    link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL, -- 'facebook', 'google', 'tiktok', 'custom'
    pixel_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Click Events Table (Neon DB Analytics)
CREATE TABLE IF NOT EXISTS click_events (
    id VARCHAR(64) PRIMARY KEY, -- evt_xxx
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    country VARCHAR(8),
    city VARCHAR(128),
    device_type VARCHAR(32),
    browser VARCHAR(64),
    os VARCHAR(64),
    referrer TEXT,
    referrer_domain VARCHAR(128),
    is_qr BOOLEAN NOT NULL DEFAULT FALSE,
    ip_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_user_time ON click_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_workspace_time ON click_events(workspace_id, timestamp DESC);

-- ==============================================================================
-- NEON POSTGRES ROW-LEVEL SECURITY (RLS) POLICIES (USER-LEVEL MULTI-TENANCY)
-- ==============================================================================

-- Enable RLS on Tenant-Scoped Tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;
DROP POLICY IF EXISTS tenant_isolation_links ON links;
DROP POLICY IF EXISTS tenant_isolation_smart_routes ON smart_routes;
DROP POLICY IF EXISTS tenant_isolation_retargeting_pixels ON retargeting_pixels;
DROP POLICY IF EXISTS tenant_isolation_click_events ON click_events;

-- Create Tenant Isolation Policies (enforcing user_id)
CREATE POLICY tenant_isolation_workspaces ON workspaces
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_links ON links
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_smart_routes ON smart_routes
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_retargeting_pixels ON retargeting_pixels
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_click_events ON click_events
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
