import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/auth'
import { generateId } from '../utils/id'
import { generateShortCode } from '../utils/base62'
import { withTenantDb } from '../db/client'

type Bindings = {
  XORU_KV: KVNamespace
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  ENVIRONMENT: string
}

const linksApp = new Hono<{ Bindings: Bindings }>()

linksApp.use('*', tenantMiddleware)

// 1. Create a Short Link
linksApp.post('/', async (c) => {
  const tenant = c.get('tenant')
  const body = await c.req.json<{
    workspace_id: string
    title: string
    destination_url: string
    custom_slug?: string
    redirect_type?: number
    expires_at?: string
  }>()

  if (!body.workspace_id || !body.title || !body.destination_url) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'workspace_id, title, and destination_url are required.' } },
      400
    )
  }

  // Validate URL format
  try {
    new URL(body.destination_url)
  } catch {
    return c.json(
      { error: { code: 'INVALID_URL', message: 'destination_url must be a valid absolute HTTP or HTTPS URL.' } },
      400
    )
  }

  const orgId = tenant.tenant_id
  const userId = tenant.user_id
  const linkId = generateId('lnk')
  const shortCode = generateShortCode(7)
  const customSlug = body.custom_slug ? body.custom_slug.trim().toLowerCase() : null
  const redirectType = body.redirect_type === 301 ? 301 : 302
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (customSlug && !/^[a-z0-9-_]+$/.test(customSlug)) {
    return c.json(
      { error: { code: 'INVALID_SLUG', message: 'custom_slug may only contain lowercase alphanumeric characters, hyphens, and underscores.' } },
      400
    )
  }

  if (dbUrl) {
    try {
      await withTenantDb(dbUrl, orgId, async (sql) => {
        // 1. Provision Org & Workspace atomically with slug = id to prevent unique constraint collisions
        await sql`
          INSERT INTO organizations (id, name, slug)
          VALUES (${orgId}, ${'Organization ' + orgId}, ${orgId})
          ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        `

        await sql`
          INSERT INTO workspaces (id, org_id, name, slug)
          VALUES (${body.workspace_id}, ${orgId}, ${'Default Workspace'}, ${body.workspace_id})
          ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        `

        // 2. Check custom slug collision if provided
        if (customSlug) {
          const existingSlug = await sql`
            SELECT id FROM links WHERE custom_slug = ${customSlug} LIMIT 1
          `
          if (existingSlug && existingSlug.length > 0) {
            throw new Error('CUSTOM_SLUG_EXISTS')
          }
        }

        // 3. Insert Short Link
        await sql`
          INSERT INTO links (
            id, org_id, workspace_id, title, destination_url,
            short_code, custom_slug, redirect_type, created_by, expires_at
          ) VALUES (
            ${linkId}, ${orgId}, ${body.workspace_id}, ${body.title}, ${body.destination_url},
            ${shortCode}, ${customSlug}, ${redirectType}, ${userId}, ${body.expires_at || null}
          )
        `
      })
    } catch (err: any) {
      console.error('POST /api/v1/links Error:', err)
      if (err.message === 'CUSTOM_SLUG_EXISTS') {
        return c.json(
          { error: { code: 'SLUG_TAKEN', message: `Custom slug '${customSlug}' is already in use.` } },
          409
        )
      }
      return c.json(
        { error: { code: 'DB_ERROR', message: err.message || String(err), stack: err.stack } },
        500
      )
    }
  }

  // Populate Cloudflare KV Edge Cache
  if (c.env?.XORU_KV) {
    await c.env.XORU_KV.put(`lnk:${shortCode}`, body.destination_url)
    if (customSlug) {
      await c.env.XORU_KV.put(`lnk:${customSlug}`, body.destination_url)
    }
  }

  const createdLink = {
    id: linkId,
    org_id: orgId,
    workspace_id: body.workspace_id,
    title: body.title,
    destination_url: body.destination_url,
    short_code: shortCode,
    custom_slug: customSlug,
    redirect_type: redirectType,
    created_by: userId,
    click_count: 0,
    created_at: new Date().toISOString(),
  }

  return c.json(createdLink, 201)
})

// 2. Get Workspace Short Links
linksApp.get('/', async (c) => {
  const tenant = c.get('tenant')
  const workspaceId = c.req.query('workspace_id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    return c.json([])
  }

  try {
    const links = await withTenantDb(dbUrl, tenant.tenant_id, async (sql) => {
      if (workspaceId) {
        return await sql`
          SELECT l.*, COALESCE(COUNT(c.id), 0)::int as click_count
          FROM links l
          LEFT JOIN click_events c ON c.link_id = l.id
          WHERE l.org_id = ${tenant.tenant_id} AND l.workspace_id = ${workspaceId}
          GROUP BY l.id
          ORDER BY l.created_at DESC
        `
      }

      return await sql`
        SELECT l.*, COALESCE(COUNT(c.id), 0)::int as click_count
        FROM links l
        LEFT JOIN click_events c ON c.link_id = l.id
        WHERE l.org_id = ${tenant.tenant_id}
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `
    })

    return c.json(links)
  } catch (err: any) {
    return c.json(
      { error: { code: 'DB_ERROR', message: err.message || 'Failed to fetch short links.' } },
      500
    )
  }
})

// 3. Delete Short Link
linksApp.delete('/:id', async (c) => {
  const tenant = c.get('tenant')
  const linkId = c.req.param('id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    return c.json({ success: true })
  }

  try {
    let shortCodeToDelete: string | null = null
    let customSlugToDelete: string | null = null

    await withTenantDb(dbUrl, tenant.tenant_id, async (sql) => {
      const existing = await sql`
        SELECT short_code, custom_slug FROM links WHERE id = ${linkId} AND org_id = ${tenant.tenant_id} LIMIT 1
      `
      if (existing.length > 0) {
        shortCodeToDelete = existing[0].short_code
        customSlugToDelete = existing[0].custom_slug

        await sql`
          DELETE FROM links WHERE id = ${linkId} AND org_id = ${tenant.tenant_id}
        `
      }
    })

    if (c.env?.XORU_KV) {
      if (shortCodeToDelete) {
        await c.env.XORU_KV.delete(`lnk:${shortCodeToDelete}`)
      }
      if (customSlugToDelete) {
        await c.env.XORU_KV.delete(`lnk:${customSlugToDelete}`)
      }
    }

    return c.json({ success: true })
  } catch (err: any) {
    return c.json(
      { error: { code: 'DB_ERROR', message: err.message || 'Failed to delete link.' } },
      500
    )
  }
})

export default linksApp
