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
    logo_url TEXT,
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

-- 4. Retargeting Pixels Table (Native Xoru Pixels & 3rd-party: Meta, Google, TikTok, Twitter, LinkedIn)
CREATE TABLE IF NOT EXISTS retargeting_pixels (
    id VARCHAR(64) PRIMARY KEY, -- pxl_xxx
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    link_id VARCHAR(64) REFERENCES links(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(32) NOT NULL, -- 'xoru', 'meta', 'google', 'tiktok', 'twitter', 'linkedin', 'custom'
    pixel_id VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_workspace_id ON retargeting_pixels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_user_id ON retargeting_pixels(user_id);

-- 5. Pixel Events Table (Xoru Native Pixel Telemetry & Conversion Stream)
CREATE TABLE IF NOT EXISTS pixel_events (
    id VARCHAR(64) PRIMARY KEY, -- pxevt_xxx
    pixel_id VARCHAR(64) NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    link_id VARCHAR(64),
    event_name VARCHAR(64) NOT NULL, -- 'pageview', 'conversion', 'custom', 'email_open'
    event_data JSONB,
    page_url TEXT,
    referrer TEXT,
    device_type VARCHAR(32),
    browser VARCHAR(64),
    os VARCHAR(64),
    country VARCHAR(8),
    city VARCHAR(128),
    ip_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pixel_events_pixel_time ON pixel_events(pixel_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_events_workspace_time ON pixel_events(workspace_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pixel_events_user_time ON pixel_events(user_id, timestamp DESC);

-- 6. Click Events Table (Neon DB Analytics)
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

-- 7. Developer API Keys Table (Usage-Based Metering, Rate Limiting & Hashed Keys)
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(64) PRIMARY KEY, -- key_xxx
    user_id VARCHAR(64) NOT NULL, -- usr_xxx
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL, -- e.g. 'xoru_live_9a8f' or legacy 'key_live_9a8f'
    key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 of raw secret
    environment VARCHAR(16) NOT NULL DEFAULT 'live', -- 'live' or 'test'
    monthly_limit INT NOT NULL DEFAULT 10000,
    requests_count INT NOT NULL DEFAULT 0,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rate_limit_per_minute INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 8. API Call Audit Logs Table (Full Request & Response Logging)
CREATE TABLE IF NOT EXISTS api_call_logs (
    id VARCHAR(64) PRIMARY KEY, -- apilog_xxx
    key_id VARCHAR(64) REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    http_method VARCHAR(16) NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_key_time ON api_call_logs(key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_workspace_time ON api_call_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_time ON api_call_logs(user_id, created_at DESC);

-- ==============================================================================
-- NEON POSTGRES ROW-LEVEL SECURITY (RLS) POLICIES (USER-LEVEL MULTI-TENANCY)
-- ==============================================================================

-- Enable RLS on Tenant-Scoped Tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-applying
DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;
DROP POLICY IF EXISTS tenant_isolation_links ON links;
DROP POLICY IF EXISTS tenant_isolation_smart_routes ON smart_routes;
DROP POLICY IF EXISTS tenant_isolation_retargeting_pixels ON retargeting_pixels;
DROP POLICY IF EXISTS tenant_isolation_click_events ON click_events;
DROP POLICY IF EXISTS tenant_isolation_pixel_events ON pixel_events;
DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;
DROP POLICY IF EXISTS tenant_isolation_api_call_logs ON api_call_logs;

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

CREATE POLICY tenant_isolation_pixel_events ON pixel_events
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_api_keys ON api_keys
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));

CREATE POLICY tenant_isolation_api_call_logs ON api_call_logs
    FOR ALL
    USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));
