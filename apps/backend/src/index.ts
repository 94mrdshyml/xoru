import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { tenantMiddleware } from './middleware/auth'
import { generateId } from './utils/id'
import { withTenantDb } from './db/client'

type Bindings = {
  XORU_KV: KVNamespace
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Global Error Handler
app.onError((err, c) => {
  console.error('Global Worker Error:', err)
  return c.json(
    { error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || String(err), stack: err.stack } },
    500
  )
})

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}))

const healthHandler = (c: any) => {
  return c.json({
    status: 'healthy',
    service: 'xoru-backend',
    tagline: 'Short Link. Real Intelligence.',
    version: '0.1.0',
    framework: 'Hono.js (TypeScript)',
  })
}

// Health check endpoints
app.get('/', healthHandler)
app.get('/api/v1/health', healthHandler)

// Authenticated user context endpoint
app.get('/api/v1/auth/me', tenantMiddleware, (c) => {
  const tenant = c.get('tenant')
  return c.json({
    tenant_id: tenant.user_id,
    user_id: tenant.user_id,
  })
})

// Workspace onboarding endpoint (Auto-provisions "<First Name>'s Workspace")
app.post('/api/v1/workspaces/onboard', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const body = await c.req.json<{
    first_name?: string
    last_name?: string
    email?: string
    workspace_name?: string
  }>().catch(() => ({} as any))

  const userId = tenant.user_id
  const firstName = (body.first_name && body.first_name.trim()) ? body.first_name.trim() : 'User'
  const workspaceName = body.workspace_name || `${firstName}'s Workspace`

  const cleanId = userId.replace(/^(usr_|user_)/, '')
  const workspaceId = generateId('wrk')
  const workspaceSlug = `wrk-${cleanId}-${workspaceId.slice(4, 10)}`

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (dbUrl) {
    try {
      await withTenantDb(dbUrl, userId, async (sql) => {
        // Check if user already has a workspace
        const existing = await sql`
          SELECT id, name, slug FROM workspaces WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
        `
        if (existing && existing.length > 0) {
          return existing[0]
        }

        await sql`
          INSERT INTO workspaces (id, user_id, name, slug)
          VALUES (${workspaceId}, ${userId}, ${workspaceName}, ${workspaceSlug})
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `
      })
    } catch (err: any) {
      console.error('Workspaces onboard DB error:', err)
      return c.json(
        { error: { code: 'DB_ERROR', message: err.message || String(err) } },
        500
      )
    }
  }

  return c.json({
    id: workspaceId,
    user_id: userId,
    name: workspaceName,
    slug: workspaceSlug,
  }, 201)
})

// List Workspaces for active user (Auto-provisions default if none exists)
app.get('/api/v1/workspaces', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const userId = tenant.user_id
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    const cleanId = userId.replace(/^(usr_|user_)/, '')
    return c.json([{ id: `wrk_${cleanId}`, user_id: userId, name: "Default Workspace", slug: "default" }])
  }

  try {
    const workspaces = await withTenantDb(dbUrl, userId, async (sql) => {
      let list = await sql`
        SELECT id, user_id, name, slug, created_at, updated_at
        FROM workspaces
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `

      // If user has zero workspaces, auto-create "<User>'s Workspace"
      if (!list || list.length === 0) {
        const cleanId = userId.replace(/^(usr_|user_)/, '')
        const newWrkId = generateId('wrk')
        const newSlug = `wrk-${cleanId}`
        const newName = `User's Workspace`

        await sql`
          INSERT INTO workspaces (id, user_id, name, slug)
          VALUES (${newWrkId}, ${userId}, ${newName}, ${newSlug})
          ON CONFLICT (id) DO NOTHING
        `

        list = await sql`
          SELECT id, user_id, name, slug, created_at, updated_at
          FROM workspaces
          WHERE user_id = ${userId}
          ORDER BY created_at ASC
        `
      }

      return list
    })
    return c.json(workspaces)
  } catch (err: any) {
    const cleanId = userId.replace(/^(usr_|user_)/, '')
    return c.json([{ id: `wrk_${cleanId}`, user_id: userId, name: "Default Workspace", slug: "default" }])
  }
})

// Create new Workspace under user
app.post('/api/v1/workspaces', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const userId = tenant.user_id
  const body = await c.req.json<{ name: string }>().catch(() => ({} as any))
  if (!body.name || !body.name.trim()) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'name is required' } }, 400)
  }

  const workspaceId = generateId('wrk')
  const cleanName = body.name.trim()
  const slugBase = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const workspaceSlug = `wrk-${slugBase}-${workspaceId.slice(4, 10)}`

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (dbUrl) {
    await withTenantDb(dbUrl, userId, async (sql) => {
      await sql`
        INSERT INTO workspaces (id, user_id, name, slug)
        VALUES (${workspaceId}, ${userId}, ${cleanName}, ${workspaceSlug})
      `
    })
  }

  return c.json({ id: workspaceId, user_id: userId, name: cleanName, slug: workspaceSlug }, 201)
})

import linksApp from './routes/links'
import { runDatabaseMigration } from './db/migrate'

// Database Migration Endpoint (Admin/Auto)
app.post('/api/v1/admin/migrate', async (c) => {
  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({ error: { code: 'MISSING_DB_URL', message: 'NEON_DATABASE_URL environment variable is missing.' } }, 500)
  }

  try {
    await runDatabaseMigration(dbUrl)
    return c.json({ status: 'success', message: 'Database schema and Neon RLS policies applied successfully.' })
  } catch (err: any) {
    return c.json({ error: { code: 'MIGRATION_FAILED', message: err.message || 'Migration failed.' } }, 500)
  }
})

// Database Reset & Clerk User Purge Endpoint (Admin)
app.post('/api/v1/admin/reset', async (c) => {
  const dbUrl = c.env?.NEON_DATABASE_URL
  const secretKey = c.env?.CLERK_SECRET_KEY
  const results: Record<string, any> = { db_reset: false, clerk_users_deleted: 0 }

  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(dbUrl)
      await sql`DROP TABLE IF EXISTS organizations CASCADE;`
      await sql`TRUNCATE TABLE click_events, retargeting_pixels, smart_routes, links, workspaces CASCADE;`
      results.db_reset = true
    } catch (err: any) {
      results.db_error = err.message || String(err)
    }
  }

  if (secretKey) {
    try {
      const { createClerkClient } = await import('@clerk/backend')
      const clerk = createClerkClient({ secretKey })
      const userList = await clerk.users.getUserList({ limit: 100 })
      let deletedCount = 0
      for (const u of userList.data) {
        await clerk.users.deleteUser(u.id)
        deletedCount++
      }
      results.clerk_users_deleted = deletedCount
    } catch (err: any) {
      results.clerk_error = err.message || String(err)
    }
  }

  return c.json({ status: 'success', message: 'Database reset and Clerk users purged successfully.', details: results })
})

// Mount Short Link CRUD Router
app.route('/api/v1/links', linksApp)

// Public Short Link Redirection Endpoint (Sub-10ms Cloudflare KV lookup + DB fallback)
app.get('/:code_or_slug', async (c) => {
  const code = c.req.param('code_or_slug')

  if (['health', 'docs', 'favicon.ico', 'api'].includes(code)) {
    return c.redirect('/api/v1/health')
  }

  // 1. Try Cloudflare KV lookup
  if (c.env?.XORU_KV) {
    const targetUrl = await c.env.XORU_KV.get(`lnk:${code}`)
    if (targetUrl) {
      return c.redirect(targetUrl, 302)
    }
  }

  // 2. Cache Miss: Fallback to Neon DB query
  const dbUrl = c.env?.NEON_DATABASE_URL
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(dbUrl)
      const rows = await sql`
        SELECT destination_url, redirect_type FROM links
        WHERE (short_code = ${code} OR custom_slug = ${code}) AND is_active = TRUE
        LIMIT 1
      `
      if (rows.length > 0) {
        const link = rows[0]
        const redirectStatus = link.redirect_type === 301 ? 301 : 302

        // Async hydrate Cloudflare KV
        if (c.env?.XORU_KV && c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil(
            c.env.XORU_KV.put(`lnk:${code}`, link.destination_url)
          )
        }

        return c.redirect(link.destination_url, redirectStatus)
      }
    } catch {
      // Continue to 404
    }
  }

  return c.json(
    { error: { code: 'LINK_NOT_FOUND', message: `Short link '${code}' not found.` } },
    404
  )
})

export type AppType = typeof app
export default app
