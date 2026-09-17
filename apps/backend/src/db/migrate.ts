import { neon } from '@neondatabase/serverless'

const MIGRATION_QUERIES = [
  `DROP TABLE IF EXISTS organizations CASCADE;`,
  `CREATE TABLE IF NOT EXISTS workspaces (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, slug)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);`,
  `CREATE TABLE IF NOT EXISTS links (
      id VARCHAR(64) PRIMARY KEY,
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_links_workspace_id ON links(workspace_id);`,
  `CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);`,
  `CREATE TABLE IF NOT EXISTS smart_routes (
      id VARCHAR(64) PRIMARY KEY,
      link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      rule_type VARCHAR(32) NOT NULL,
      rule_condition JSONB NOT NULL,
      target_url TEXT NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS retargeting_pixels (
      id VARCHAR(64) PRIMARY KEY,
      link_id VARCHAR(64) NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      platform VARCHAR(32) NOT NULL,
      pixel_id VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS click_events (
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
  );`,
  `ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE links ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE smart_routes ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE retargeting_pixels ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;`,
  `DROP POLICY IF EXISTS tenant_isolation_links ON links;`,
  `DROP POLICY IF EXISTS tenant_isolation_smart_routes ON smart_routes;`,
  `DROP POLICY IF EXISTS tenant_isolation_retargeting_pixels ON retargeting_pixels;`,
  `DROP POLICY IF EXISTS tenant_isolation_click_events ON click_events;`,
  `CREATE POLICY tenant_isolation_workspaces ON workspaces FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`,
  `CREATE POLICY tenant_isolation_links ON links FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`,
  `CREATE POLICY tenant_isolation_smart_routes ON smart_routes FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`,
  `CREATE POLICY tenant_isolation_retargeting_pixels ON retargeting_pixels FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`,
  `CREATE POLICY tenant_isolation_click_events ON click_events FOR ALL USING (user_id = CURRENT_SETTING('app.current_tenant_id', true));`
]

export async function runDatabaseMigration(databaseUrl: string) {
  const sql = neon(databaseUrl)
  for (const query of MIGRATION_QUERIES) {
    try {
      await sql(query)
    } catch (err: any) {
      console.warn('Migration step error (ignored):', err?.message || err)
    }
  }
}
