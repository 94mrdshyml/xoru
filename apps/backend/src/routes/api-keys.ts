import { Hono } from 'hono'
import { tenantMiddleware, hashApiKey } from '../middleware/auth'
import { generateId } from '../utils/id'

type Bindings = {
  XORU_KV: KVNamespace
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  ENVIRONMENT: string
}

export const apiKeysRouter = new Hono<{ Bindings: Bindings }>()

// Helper to ensure api_keys & api_call_logs tables exist defensively
async function ensureApiKeysTablesExist(sql: any) {
  try {
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
  } catch (err) {
    // Non-fatal if already present
  }
}

// Generate random 32-char alphanumeric string for API secret
function generateSecretToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

// -----------------------------------------------------------------------------
// 1. LIST API KEYS FOR WORKSPACE: GET /api/v1/api-keys
// -----------------------------------------------------------------------------
apiKeysRouter.get('/', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const workspaceId = c.req.header('x-workspace-id') || c.req.query('workspace_id') || tenant.workspace_id
  if (!workspaceId) {
    return c.json(
      { error: { code: 'MISSING_WORKSPACE_ID', message: 'workspace_id is required via query parameter (?workspace_id=...) or X-Workspace-Id header.' } },
      400
    )
  }

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json([
      {
        id: 'key_demo_default',
        user_id: tenant.user_id,
        workspace_id: workspaceId,
        name: 'Default Development Key',
        key_prefix: 'xoru_live_9a8f••••••••',
        environment: 'live',
        monthly_limit: 10000,
        requests_count: 0,
        rate_limit_per_minute: 60,
        is_active: true,
        last_used_at: null,
        expires_at: null,
        created_at: new Date().toISOString(),
      },
    ])
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    const rows = await sql`
      SELECT 
        id, user_id, workspace_id, name, key_prefix, environment,
        monthly_limit, requests_count, billing_cycle_start,
        rate_limit_per_minute, is_active, last_used_at, expires_at, created_at
      FROM api_keys
      WHERE user_id = ${tenant.user_id} AND workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `

    return c.json(rows)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// -----------------------------------------------------------------------------
// 2. PROVISION NEW API KEY: POST /api/v1/api-keys
// -----------------------------------------------------------------------------
apiKeysRouter.post('/', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const body = await c.req.json<{
    name?: string
    workspace_id?: string
    environment?: 'live' | 'test'
    monthly_limit?: number
    rate_limit_per_minute?: number
    expires_in_days?: number | null
  }>().catch(() => ({} as any))

  const workspaceId = body.workspace_id || c.req.header('x-workspace-id') || c.req.query('workspace_id') || tenant.workspace_id
  if (!workspaceId) {
    return c.json(
      { error: { code: 'MISSING_WORKSPACE_ID', message: 'workspace_id is required in the request body or X-Workspace-Id header.' } },
      400
    )
  }

  const name = (body.name && body.name.trim()) ? body.name.trim() : 'Developer API Key'
  const environment = body.environment === 'test' ? 'test' : 'live'
  const monthlyLimit = typeof body.monthly_limit === 'number' && body.monthly_limit > 0 ? body.monthly_limit : 10000
  const rateLimitPerMinute = typeof body.rate_limit_per_minute === 'number' && body.rate_limit_per_minute > 0 ? body.rate_limit_per_minute : 60

  // Expiration calculation
  let expiresAt: string | null = null
  if (body.expires_in_days && body.expires_in_days > 0) {
    const d = new Date()
    d.setDate(d.getDate() + body.expires_in_days)
    expiresAt = d.toISOString()
  }

  // Generate Stripe-style raw secret key: xoru_live_{32-chars} or xoru_test_{32-chars}
  const secretRandom = generateSecretToken()
  const rawKeySecret = `xoru_${environment}_${secretRandom}`
  const keyPrefix = `${rawKeySecret.slice(0, 14)}••••••••${rawKeySecret.slice(-4)}`
  const keyHash = await hashApiKey(rawKeySecret)
  const id = generateId('key')

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({
      id,
      user_id: tenant.user_id,
      workspace_id: workspaceId,
      name,
      key_secret: rawKeySecret,
      key_prefix: keyPrefix,
      environment,
      monthly_limit: monthlyLimit,
      rate_limit_per_minute: rateLimitPerMinute,
      requests_count: 0,
      is_active: true,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, 201)
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    // Ensure effective workspace
    let effectiveWorkspaceId = workspaceId
    if (!effectiveWorkspaceId) {
      const wrkRows = await sql`SELECT id FROM workspaces WHERE user_id = ${tenant.user_id} LIMIT 1`
      if (wrkRows.length > 0) {
        effectiveWorkspaceId = wrkRows[0].id
      } else {
        const newWrkId = generateId('wrk')
        await sql`
          INSERT INTO workspaces (id, user_id, name, slug)
          VALUES (${newWrkId}, ${tenant.user_id}, 'Personal Workspace', ${'wrk-personal-' + newWrkId.slice(4, 10)})
        `
        effectiveWorkspaceId = newWrkId
      }
    }

    const rows = await sql`
      INSERT INTO api_keys (
        id, user_id, workspace_id, name, key_prefix, key_hash,
        environment, monthly_limit, requests_count, rate_limit_per_minute,
        is_active, expires_at
      ) VALUES (
        ${id}, ${tenant.user_id}, ${effectiveWorkspaceId}, ${name}, ${keyPrefix}, ${keyHash},
        ${environment}, ${monthlyLimit}, 0, ${rateLimitPerMinute},
        TRUE, ${expiresAt}
      )
      RETURNING id, user_id, workspace_id, name, key_prefix, environment, monthly_limit, requests_count, rate_limit_per_minute, is_active, expires_at, created_at
    `

    // Cache key in KV for sub-10ms edge authorization
    if (c.env?.XORU_KV && c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(
        c.env.XORU_KV.put(
          `apikey:${keyHash}`,
          JSON.stringify({
            id,
            user_id: tenant.user_id,
            workspace_id: effectiveWorkspaceId,
            environment,
            rate_limit_per_minute: rateLimitPerMinute,
            monthly_limit: monthlyLimit,
            is_active: true,
            expires_at: expiresAt,
          })
        )
      )
    }

    // Return the raw secret key ONCE upon creation
    return c.json({
      ...rows[0],
      key_secret: rawKeySecret,
    }, 201)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// -----------------------------------------------------------------------------
// 3. UPDATE API KEY: PATCH /api/v1/api-keys/:id
// -----------------------------------------------------------------------------
apiKeysRouter.patch('/:id', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    is_active?: boolean
    monthly_limit?: number
    rate_limit_per_minute?: number
  }>().catch(() => ({} as any))

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({ id, ...body, updated_at: new Date().toISOString() })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    const existing = await sql`
      SELECT id, key_hash, workspace_id FROM api_keys WHERE id = ${id} AND user_id = ${tenant.user_id}
    `
    if (existing.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found.' } }, 404)
    }

    const rows = await sql`
      UPDATE api_keys
      SET
        name = COALESCE(${body.name?.trim() || null}, name),
        is_active = COALESCE(${body.is_active !== undefined ? body.is_active : null}, is_active),
        monthly_limit = COALESCE(${body.monthly_limit || null}, monthly_limit),
        rate_limit_per_minute = COALESCE(${body.rate_limit_per_minute || null}, rate_limit_per_minute)
      WHERE id = ${id} AND user_id = ${tenant.user_id}
      RETURNING id, user_id, workspace_id, name, key_prefix, environment, monthly_limit, requests_count, rate_limit_per_minute, is_active, last_used_at, expires_at, created_at
    `

    // Update or purge KV cache
    if (c.env?.XORU_KV && c.executionCtx?.waitUntil) {
      const keyHash = existing[0].key_hash
      if (body.is_active === false) {
        c.executionCtx.waitUntil(c.env.XORU_KV.delete(`apikey:${keyHash}`))
      } else {
        c.executionCtx.waitUntil(
          c.env.XORU_KV.put(
            `apikey:${keyHash}`,
            JSON.stringify({
              id,
              user_id: tenant.user_id,
              workspace_id: existing[0].workspace_id,
              environment: rows[0].environment,
              rate_limit_per_minute: rows[0].rate_limit_per_minute,
              monthly_limit: rows[0].monthly_limit,
              is_active: rows[0].is_active,
              expires_at: rows[0].expires_at,
            })
          )
        )
      }
    }

    return c.json(rows[0])
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// -----------------------------------------------------------------------------
// 4. REVOKE / DELETE API KEY: DELETE /api/v1/api-keys/:id
// -----------------------------------------------------------------------------
apiKeysRouter.delete('/:id', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    return c.json({ success: true, id })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    const keyRows = await sql`
      SELECT id, key_hash FROM api_keys WHERE id = ${id} AND user_id = ${tenant.user_id}
    `
    if (keyRows.length > 0 && c.env?.XORU_KV && c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil(c.env.XORU_KV.delete(`apikey:${keyRows[0].key_hash}`))
    }

    await sql`
      DELETE FROM api_keys
      WHERE id = ${id} AND user_id = ${tenant.user_id}
    `

    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// -----------------------------------------------------------------------------
// 5. LIVE REQUEST & RESPONSE AUDIT LOGS STREAM: GET /api/v1/api-keys/logs
// -----------------------------------------------------------------------------
apiKeysRouter.get('/logs', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const keyId = c.req.query('key_id')
  const workspaceId = c.req.header('x-workspace-id') || c.req.query('workspace_id') || tenant.workspace_id

  if (!keyId && !workspaceId) {
    return c.json(
      { error: { code: 'MISSING_WORKSPACE_ID', message: 'workspace_id is required via query parameter (?workspace_id=...) or X-Workspace-Id header unless key_id is specified.' } },
      400
    )
  }

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json([
      {
        id: 'apilog_sample_01',
        key_id: keyId || 'key_demo_01',
        user_id: tenant.user_id,
        workspace_id: workspaceId || 'wrk_default',
        http_method: 'POST',
        endpoint: '/api/v1/links',
        status_code: 201,
        response_time_ms: 12,
        request_headers: { 'content-type': 'application/json', 'user-agent': 'curl/8.1.2' },
        request_body: { destination_url: 'https://example.com/promo', title: 'Marketing Link' },
        response_body: { success: true, short_code: 'p9k2x', short_url: 'https://xoru.link/p9k2x' },
        error_message: null,
        ip_hash: '8f92a1c0d4e5f6',
        user_agent: 'curl/8.1.2',
        created_at: new Date().toISOString(),
      },
    ])
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    let rows
    if (keyId) {
      rows = await sql`
        SELECT 
          l.id, l.key_id, l.user_id, l.workspace_id, l.http_method, l.endpoint,
          l.status_code, l.response_time_ms, l.request_headers, l.request_body,
          l.response_body, l.error_message, l.ip_hash, l.user_agent, l.created_at,
          k.name as key_name, k.key_prefix
        FROM api_call_logs l
        LEFT JOIN api_keys k ON k.id = l.key_id
        WHERE l.user_id = ${tenant.user_id} AND l.key_id = ${keyId}
        ORDER BY l.created_at DESC
        LIMIT 50
      `
    } else {
      rows = await sql`
        SELECT 
          l.id, l.key_id, l.user_id, l.workspace_id, l.http_method, l.endpoint,
          l.status_code, l.response_time_ms, l.request_headers, l.request_body,
          l.response_body, l.error_message, l.ip_hash, l.user_agent, l.created_at,
          k.name as key_name, k.key_prefix
        FROM api_call_logs l
        LEFT JOIN api_keys k ON k.id = l.key_id
        WHERE l.user_id = ${tenant.user_id} AND l.workspace_id = ${workspaceId}
        ORDER BY l.created_at DESC
        LIMIT 50
      `
    }

    return c.json(rows)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// -----------------------------------------------------------------------------
// 6. USAGE & BILLING METER SUMMARY: GET /api/v1/api-keys/usage
// -----------------------------------------------------------------------------
apiKeysRouter.get('/usage', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const workspaceId = c.req.header('x-workspace-id') || c.req.query('workspace_id') || tenant.workspace_id
  if (!workspaceId) {
    return c.json(
      { error: { code: 'MISSING_WORKSPACE_ID', message: 'workspace_id is required via query parameter (?workspace_id=...) or X-Workspace-Id header.' } },
      400
    )
  }

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({
      total_requests: 2450,
      monthly_limit: 10000,
      usage_percent: 24.5,
      active_keys_count: 2,
      billing_cycle_reset_days: 12,
    })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    await ensureApiKeysTablesExist(sql)

    const rows = await sql`
      SELECT 
        COALESCE(SUM(requests_count), 0)::int AS total_requests,
        COALESCE(SUM(monthly_limit), 10000)::int AS total_limit,
        COUNT(id)::int AS active_keys_count
      FROM api_keys
      WHERE user_id = ${tenant.user_id} AND workspace_id = ${workspaceId} AND is_active = TRUE
    `

    const totalRequests = rows[0]?.total_requests || 0
    const totalLimit = rows[0]?.total_limit || 10000
    const usagePercent = totalLimit > 0 ? Math.min(100, Math.round((totalRequests / totalLimit) * 1000) / 10) : 0

    return c.json({
      total_requests: totalRequests,
      monthly_limit: totalLimit,
      usage_percent: usagePercent,
      active_keys_count: rows[0]?.active_keys_count || 0,
      billing_cycle_reset_days: 30 - (new Date().getDate()),
    })
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

