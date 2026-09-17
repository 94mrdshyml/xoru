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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, slug)
    );
  `
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
      link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform VARCHAR(32) NOT NULL,
      pixel_id VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
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
      ip_hash VARCHAR(64) NOT NULL
    );
  `

  // 6. Row-Level Security
  await sql`ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE links ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;`
  await sql`ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;`

  await sql`DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_links ON links;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_smart_routes ON smart_routes;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_retargeting_pixels ON retargeting_pixels;`
  await sql`DROP POLICY IF EXISTS tenant_isolation_click_events ON click_events;`

  await sql`CREATE POLICY tenant_isolation_workspaces ON workspaces FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_links ON links FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_smart_routes ON smart_routes FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_retargeting_pixels ON retargeting_pixels FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
  await sql`CREATE POLICY tenant_isolation_click_events ON click_events FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
}
