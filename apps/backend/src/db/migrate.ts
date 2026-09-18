import { neon } from '@neondatabase/serverless'

export async function runDatabaseMigration(databaseUrl: string) {
  const sql = neon(databaseUrl)

  // 1. Workspaces
  await sql`
    CREATE TABLE IF NOT EXISTS workspaces (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      logo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, slug)
    );
  `
  await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;`
  await sql`CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);`

  // 2. Links
  await sql`
    CREATE TABLE IF NOT EXISTS links (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      destination_url TEXT NOT NULL,
      short_code VARCHAR(32) UNIQUE NOT NULL,
      custom_slug VARCHAR(128) UNIQUE,
      redirect_type INT NOT NULL DEFAULT 301,
      password_hash VARCHAR(255),
      password_salt VARCHAR(64),
      is_one_time BOOLEAN NOT NULL DEFAULT FALSE,
      is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
      consumed_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at TIMESTAMPTZ,
      created_by VARCHAR(64) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `

  // 3. Additive Column Alterations (Guaranteed idempotent)
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS description TEXT;`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS password_salt VARCHAR(64);`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN NOT NULL DEFAULT FALSE;`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN NOT NULL DEFAULT FALSE;`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;`
  await sql`ALTER TABLE links ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`

  // 4. Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_links_workspace_id ON links(workspace_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);`
  await sql`CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at) WHERE expires_at IS NOT NULL;`

  // 5. Smart Routes & Pixels & Analytics
  await sql`
    CREATE TABLE IF NOT EXISTS smart_routes (
      id VARCHAR(64) PRIMARY KEY,
      link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      rule_type VARCHAR(32) NOT NULL,
      rule_condition JSONB NOT NULL,
      target_url TEXT NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await sql`
    CREATE TABLE IF NOT EXISTS retargeting_pixels (
      id VARCHAR(64) PRIMARY KEY,
      link_id VARCHAR(64) REFERENCES links(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL DEFAULT 'Pixel',
      platform VARCHAR(32) NOT NULL,
      pixel_id VARCHAR(128) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await sql`ALTER TABLE retargeting_pixels ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL DEFAULT 'Pixel';`
  await sql`ALTER TABLE retargeting_pixels ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`
  await sql`ALTER TABLE retargeting_pixels ALTER COLUMN link_id DROP NOT NULL;`
  await sql`CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_workspace_id ON retargeting_pixels(workspace_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_retargeting_pixels_user_id ON retargeting_pixels(user_id);`

  await sql`
    CREATE TABLE IF NOT EXISTS pixel_events (
      id VARCHAR(64) PRIMARY KEY,
      pixel_id VARCHAR(64) NOT NULL REFERENCES retargeting_pixels(id) ON DELETE CASCADE,
      workspace_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      link_id VARCHAR(64),
      event_name VARCHAR(64) NOT NULL,
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
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_pixel_events_pixel_time ON pixel_events(pixel_id, timestamp DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_pixel_events_workspace_time ON pixel_events(workspace_id, timestamp DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_pixel_events_user_time ON pixel_events(user_id, timestamp DESC);`

  await sql`
    CREATE TABLE IF NOT EXISTS click_events (
      id VARCHAR(64) PRIMARY KEY,
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
  `

  await sql`ALTER TABLE click_events ADD COLUMN IF NOT EXISTS referrer_domain VARCHAR(128);`
  await sql`ALTER TABLE click_events ADD COLUMN IF NOT EXISTS is_qr BOOLEAN NOT NULL DEFAULT FALSE;`
  await sql`CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, timestamp DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_click_events_user_time ON click_events(user_id, timestamp DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_click_events_workspace_time ON click_events(workspace_id, timestamp DESC);`

  // 6. Developer API Keys & API Call Logs
  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      key_prefix VARCHAR(32) NOT NULL,
      key_hash VARCHAR(64) UNIQUE NOT NULL,
      environment VARCHAR(16) NOT NULL DEFAULT 'live',
      monthly_limit INT NOT NULL DEFAULT 10000,
      requests_count INT NOT NULL DEFAULT 0,
      billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rate_limit_per_minute INT NOT NULL DEFAULT 60,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_workspace_id ON api_keys(workspace_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);`

  await sql`
    CREATE TABLE IF NOT EXISTS api_call_logs (
      id VARCHAR(64) PRIMARY KEY,
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
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_api_call_logs_key_time ON api_call_logs(key_id, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_api_call_logs_workspace_time ON api_call_logs(workspace_id, created_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_time ON api_call_logs(user_id, created_at DESC);`

  // 7. Row-Level Security
  await sql`ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE links ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;`

  await sql`DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_links ON links;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_smart_routes ON smart_routes;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_retargeting_pixels ON retargeting_pixels;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_click_events ON click_events;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_pixel_events ON pixel_events;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_api_keys ON api_keys;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_api_call_logs ON api_call_logs;`

  await sql`CREATE POLICY tenant_isolation_workspaces ON workspaces FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_links ON links FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_smart_routes ON smart_routes FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_retargeting_pixels ON retargeting_pixels FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_click_events ON click_events FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_pixel_events ON pixel_events FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_api_keys ON api_keys FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_api_call_logs ON api_call_logs FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
}
