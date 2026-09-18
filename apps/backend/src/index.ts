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
import analyticsApp from './routes/analytics'
import { runDatabaseMigration } from './db/migrate'
import { extractTelemetry, logClickEventToDb } from './utils/telemetry'

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

// Mount Analytics Router
app.route('/api/v1/analytics', analyticsApp)

import { verifyPassword } from './utils/crypto'

function renderPasswordChallengeHtml(code: string, error?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Link — Xoru</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Open Sans', sans-serif; }</style>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
    <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <div>
        <h1 class="text-lg font-bold text-slate-900">Protected Short Link</h1>
        <p class="text-xs text-slate-500 font-medium">This short link is encrypted with password protection.</p>
      </div>
    </div>

    ${error ? `
    <div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>${error}</span>
    </div>
    ` : ''}

    <form method="POST" action="/${code}/verify" class="space-y-4">
      <div>
        <label for="password" class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Enter Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autofocus
          placeholder="••••••••••••"
          class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <span>Unlock & Continue</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
        </svg>
      </button>
    </form>

    <div class="text-center pt-2">
      <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Secured by Xoru Edge Intelligence</span>
    </div>
  </div>
</body>
</html>`
}

function renderLinkExpiredHtml(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Xoru</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Open Sans', sans-serif; }</style>
</head>
<body class="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-4">
    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <h1 class="text-xl font-bold text-slate-900">${title}</h1>
    <p class="text-sm text-slate-500 max-w-xs mx-auto">${message}</p>
    <div class="pt-4 border-t border-slate-100">
      <a href="https://xoru-frontend.mridu.workers.dev" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
        Create your own intelligent short links on Xoru &rarr;
      </a>
    </div>
  </div>
</body>
</html>`
}

// Public Short Link Redirection Endpoint (Sub-10ms Cloudflare KV lookup + DB fallback + Password/One-time protection)
app.get('/:code_or_slug', async (c) => {
  const code = c.req.param('code_or_slug')

  if (['health', 'docs', 'favicon.ico', 'api'].includes(code)) {
    return c.redirect('/api/v1/health')
  }

  // 1. Try Cloudflare KV lookup
  if (c.env?.XORU_KV) {
    const rawKv = await c.env.XORU_KV.get(`lnk:${code}`)
    if (rawKv) {
      if (rawKv.startsWith('{')) {
        try {
          const meta = JSON.parse(rawKv)
          // Expiration check
          if (meta.expires_at && new Date(meta.expires_at) < new Date()) {
            await c.env.XORU_KV.delete(`lnk:${code}`)
            return c.html(renderLinkExpiredHtml('Short Link Expired', 'This short link has reached its scheduled expiration date and is no longer active.'), 410)
          }

          // Password check
          if (meta.password_hash) {
            return c.html(renderPasswordChallengeHtml(code))
          }

          // If not one-time, instant redirect & trigger async background click logging
          if (!meta.is_one_time) {
            if (meta.id && c.env?.NEON_DATABASE_URL && c.executionCtx?.waitUntil) {
              c.executionCtx.waitUntil((async () => {
                try {
                  let targetUserId = meta.user_id
                  let targetWorkspaceId = meta.workspace_id

                  if (!targetUserId && c.env.NEON_DATABASE_URL) {
                    const { neon } = await import('@neondatabase/serverless')
                    const sql = neon(c.env.NEON_DATABASE_URL)
                    const linkRow = await sql`SELECT user_id, workspace_id FROM links WHERE id = ${meta.id} LIMIT 1`
                    if (linkRow && linkRow.length > 0) {
                      targetUserId = linkRow[0].user_id
                      targetWorkspaceId = linkRow[0].workspace_id
                      meta.user_id = targetUserId
                      meta.workspace_id = targetWorkspaceId
                      if (c.env.XORU_KV) {
                        await c.env.XORU_KV.put(`lnk:${code}`, JSON.stringify(meta))
                      }
                    }
                  }

                  if (targetUserId) {
                    const telemetry = await extractTelemetry(c.req.raw, new URL(c.req.url))
                    const rawReferrer = c.req.header('referer') || c.req.header('referrer') || ''
                    await logClickEventToDb({
                      dbUrl: c.env.NEON_DATABASE_URL,
                      linkId: meta.id,
                      userId: targetUserId,
                      workspaceId: targetWorkspaceId || `wrk_${targetUserId.replace(/^(usr_|user_)/, '')}`,
                      rawReferrer,
                      telemetry,
                    })
                  }
                } catch (err) {
                  console.error('Async KV click log error:', err)
                }
              })())
            }

            return c.redirect(meta.destination_url, meta.redirect_type === 301 ? 301 : 302)
          }
        } catch {
          // Fallback to plain redirect or DB query
        }
      } else {
        // Legacy plain URL string in KV
        return c.redirect(rawKv, 302)
      }
    }
  }

  // 2. Fallback to Neon DB query
  const dbUrl = c.env?.NEON_DATABASE_URL
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless')
      const sql = neon(dbUrl)
      const rows = await sql`
        SELECT 
          id, user_id, workspace_id, destination_url, redirect_type, password_hash, password_salt,
          is_one_time, is_consumed, expires_at, is_active
        FROM links
        WHERE (short_code = ${code} OR custom_slug = ${code})
        LIMIT 1
      `
      if (rows.length > 0) {
        const link = rows[0]

        // Check if link is inactive or already consumed
        if (!link.is_active || link.is_consumed) {
          if (link.is_one_time) {
            return c.html(renderLinkExpiredHtml('One-Time Link Consumed', 'This one-time link has already been opened and permanently destroyed.'), 410)
          }
          return c.html(renderLinkExpiredHtml('Link Inactive', 'This short link is currently disabled.'), 410)
        }

        // Check expiration
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          return c.html(renderLinkExpiredHtml('Short Link Expired', 'This short link has reached its scheduled expiration date and is no longer active.'), 410)
        }

        // Check password challenge
        if (link.password_hash) {
          return c.html(renderPasswordChallengeHtml(code))
        }

        // Trigger async click logging
        if (c.env?.NEON_DATABASE_URL && c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil((async () => {
            try {
              const telemetry = await extractTelemetry(c.req.raw, new URL(c.req.url))
              const rawReferrer = c.req.header('referer') || c.req.header('referrer') || ''
              await logClickEventToDb({
                dbUrl: c.env.NEON_DATABASE_URL,
                linkId: link.id,
                userId: link.user_id,
                workspaceId: link.workspace_id,
                rawReferrer,
                telemetry,
              })
            } catch (err) {
              console.error('Async DB click log error:', err)
            }
          })())
        }

        // Handle one-time consumption atomically
        if (link.is_one_time) {
          const consumeResult = await sql`
            UPDATE links
            SET is_active = FALSE, is_consumed = TRUE, consumed_at = NOW()
            WHERE id = ${link.id} AND is_active = TRUE AND is_consumed = FALSE
            RETURNING destination_url
          `
          if (!consumeResult || consumeResult.length === 0) {
            return c.html(renderLinkExpiredHtml('One-Time Link Consumed', 'This one-time link has already been opened and permanently destroyed.'), 410)
          }

          if (c.env?.XORU_KV) {
            await c.env.XORU_KV.delete(`lnk:${code}`)
          }
          return c.redirect(link.destination_url, 302)
        }

        // Standard link: Hydrate KV and redirect
        const redirectStatus = link.redirect_type === 301 ? 301 : 302
        if (c.env?.XORU_KV && c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil(
            c.env.XORU_KV.put(
              `lnk:${code}`,
              JSON.stringify({
                id: link.id,
                user_id: link.user_id,
                workspace_id: link.workspace_id,
                destination_url: link.destination_url,
                redirect_type: redirectStatus,
                password_hash: link.password_hash,
                password_salt: link.password_salt,
                is_one_time: link.is_one_time,
                expires_at: link.expires_at,
              })
            )
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

// Password Verification Endpoint for Protected Links
app.post('/:code_or_slug/verify', async (c) => {
  const code = c.req.param('code_or_slug')
  const contentType = c.req.header('content-type') || ''
  let password = ''

  if (contentType.includes('application/json')) {
    const body = await c.req.json<{ password?: string }>().catch(() => ({} as any))
    password = body.password || ''
  } else {
    const formData = await c.req.parseBody().catch(() => ({} as any))
    password = String(formData.password || '')
  }

  if (!password) {
    if (contentType.includes('application/json')) {
      return c.json({ error: { code: 'INVALID_PASSWORD', message: 'Password is required.' } }, 400)
    }
    return c.html(renderPasswordChallengeHtml(code, 'Please enter a password.'), 400)
  }

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({ error: { code: 'DB_UNAVAILABLE', message: 'Database connection unavailable.' } }, 500)
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT 
        id, user_id, workspace_id, destination_url, redirect_type, password_hash, password_salt,
        is_one_time, is_consumed, expires_at, is_active
      FROM links
      WHERE (short_code = ${code} OR custom_slug = ${code})
      LIMIT 1
    `

    if (rows.length === 0) {
      return c.json({ error: { code: 'LINK_NOT_FOUND', message: `Short link '${code}' not found.` } }, 404)
    }

    const link = rows[0]

    // Check active / consumed status
    if (!link.is_active || link.is_consumed) {
      return c.html(renderLinkExpiredHtml('Link Inactive', 'This short link is no longer available.'), 410)
    }

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return c.html(renderLinkExpiredHtml('Short Link Expired', 'This short link has reached its expiration date.'), 410)
    }

    // Verify Password
    if (link.password_hash && link.password_salt) {
      const isValid = await verifyPassword(password, link.password_salt, link.password_hash)
      if (!isValid) {
        if (contentType.includes('application/json')) {
          return c.json({ error: { code: 'INVALID_PASSWORD', message: 'Incorrect password.' } }, 401)
        }
        return c.html(renderPasswordChallengeHtml(code, 'Incorrect password. Please try again.'), 401)
      }
    }

    // Log verified click
    if (c.env?.NEON_DATABASE_URL && c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil((async () => {
        try {
          const telemetry = await extractTelemetry(c.req.raw, new URL(c.req.url))
          const rawReferrer = c.req.header('referer') || c.req.header('referrer') || ''
          await logClickEventToDb({
            dbUrl: c.env.NEON_DATABASE_URL,
            linkId: link.id,
            userId: link.user_id,
            workspaceId: link.workspace_id,
            rawReferrer,
            telemetry,
          })
        } catch (err) {
          console.error('Async password click log error:', err)
        }
      })())
    }

    // Handle One-Time Consumption
    if (link.is_one_time) {
      const consumeResult = await sql`
        UPDATE links
        SET is_active = FALSE, is_consumed = TRUE, consumed_at = NOW()
        WHERE id = ${link.id} AND is_active = TRUE AND is_consumed = FALSE
        RETURNING destination_url
      `
      if (!consumeResult || consumeResult.length === 0) {
        return c.html(renderLinkExpiredHtml('One-Time Link Consumed', 'This one-time link has already been opened and permanently destroyed.'), 410)
      }

      if (c.env?.XORU_KV) {
        await c.env.XORU_KV.delete(`lnk:${code}`)
      }
    }

    if (contentType.includes('application/json')) {
      return c.json({ success: true, destination_url: link.destination_url })
    }

    return c.redirect(link.destination_url, 302)
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message || String(err) } }, 500)
  }
})

export type AppType = typeof app
export default app
