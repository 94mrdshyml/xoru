import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/auth'
import { generateId } from '../utils/id'
import { generateShortCode } from '../utils/base62'
import { generateSalt, hashPassword } from '../utils/crypto'
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
    workspace_id?: string
    title: string
    description?: string
    destination_url: string
    custom_slug?: string
    redirect_type?: number
    password?: string
    is_one_time?: boolean
    expires_at?: string
  }>()

  if (!body.title || !body.destination_url) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'title and destination_url are required.' } },
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

  const userId = tenant.user_id
  const dbUrl = c.env?.NEON_DATABASE_URL

  const linkId = generateId('lnk')
  const shortCode = generateShortCode(7)
  const customSlug = body.custom_slug ? body.custom_slug.trim().toLowerCase() : null
  const redirectType = body.redirect_type === 301 ? 301 : 302
  const description = body.description ? body.description.trim() : null
  const isOneTime = Boolean(body.is_one_time)
  const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null

  // Password Hashing
  let passwordSalt: string | null = null
  let passwordHash: string | null = null
  if (body.password && body.password.trim()) {
    passwordSalt = generateSalt(16)
    passwordHash = await hashPassword(body.password.trim(), passwordSalt)
  }

  if (customSlug && !/^[a-z0-9-_]+$/.test(customSlug)) {
    return c.json(
      { error: { code: 'INVALID_SLUG', message: 'custom_slug may only contain lowercase alphanumeric characters, hyphens, and underscores.' } },
      400
    )
  }

  let effectiveWorkspaceId = body.workspace_id

  if (dbUrl) {
    try {
      await withTenantDb(dbUrl, userId, async (sql) => {
        // 1. Check if effectiveWorkspaceId actually exists in DB for this user
        let validWorkspaceId: string | null = null
        if (effectiveWorkspaceId && !effectiveWorkspaceId.startsWith('org_') && effectiveWorkspaceId !== 'wrk_default') {
          const checkWrk = await sql`
            SELECT id FROM workspaces WHERE id = ${effectiveWorkspaceId} AND user_id = ${userId} LIMIT 1
          `
          if (checkWrk && checkWrk.length > 0) {
            validWorkspaceId = checkWrk[0].id
          }
        }

        // 2. If valid workspace found, use it. Otherwise, fetch or create a valid workspace
        if (validWorkspaceId) {
          effectiveWorkspaceId = validWorkspaceId
        } else {
          const existingWrk = await sql`
            SELECT id FROM workspaces WHERE user_id = ${userId} ORDER BY created_at ASC LIMIT 1
          `
          if (existingWrk && existingWrk.length > 0) {
            effectiveWorkspaceId = existingWrk[0].id
          } else {
            const cleanId = userId.replace(/^(usr_|user_)/, '')
            const newWrkId = generateId('wrk')
            const workspaceSlug = `wrk-${cleanId}-${newWrkId.slice(4, 10)}`
            await sql`
              INSERT INTO workspaces (id, user_id, name, slug)
              VALUES (${newWrkId}, ${userId}, ${'Personal Workspace'}, ${workspaceSlug})
              ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            `
            effectiveWorkspaceId = newWrkId
          }
        }

        // Check custom slug collision if provided
        if (customSlug) {
          const existingSlug = await sql`
            SELECT id FROM links WHERE custom_slug = ${customSlug} LIMIT 1
          `
          if (existingSlug && existingSlug.length > 0) {
            throw new Error('CUSTOM_SLUG_EXISTS')
          }
        }

        // Insert Short Link
        await sql`
          INSERT INTO links (
            id, user_id, workspace_id, title, description, destination_url,
            short_code, custom_slug, redirect_type, password_hash, password_salt,
            is_one_time, is_consumed, created_by, expires_at
          ) VALUES (
            ${linkId}, ${userId}, ${effectiveWorkspaceId}, ${body.title}, ${description}, ${body.destination_url},
            ${shortCode}, ${customSlug}, ${redirectType}, ${passwordHash}, ${passwordSalt},
            ${isOneTime}, FALSE, ${userId}, ${expiresAt}
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
  } else {
    if (!effectiveWorkspaceId) {
      effectiveWorkspaceId = `wrk_${userId.replace(/^(usr_|user_)/, '')}`
    }
  }

  // Populate Cloudflare KV Edge Cache with structured metadata
  if (c.env?.XORU_KV) {
    const kvPayload = JSON.stringify({
      id: linkId,
      destination_url: body.destination_url,
      redirect_type: redirectType,
      password_hash: passwordHash,
      password_salt: passwordSalt,
      is_one_time: isOneTime,
      expires_at: expiresAt,
    })
    await c.env.XORU_KV.put(`lnk:${shortCode}`, kvPayload)
    if (customSlug) {
      await c.env.XORU_KV.put(`lnk:${customSlug}`, kvPayload)
    }
  }

  const createdLink = {
    id: linkId,
    user_id: userId,
    workspace_id: effectiveWorkspaceId,
    title: body.title,
    description: description,
    destination_url: body.destination_url,
    short_code: shortCode,
    custom_slug: customSlug,
    redirect_type: redirectType,
    is_protected: Boolean(passwordHash),
    is_one_time: isOneTime,
    is_consumed: false,
    expires_at: expiresAt,
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
    const links = await withTenantDb(dbUrl, tenant.user_id, async (sql) => {
      let queryResult
      if (workspaceId) {
        queryResult = await sql`
          SELECT 
            l.id, l.user_id, l.workspace_id, l.title, l.description, l.destination_url,
            l.short_code, l.custom_slug, l.redirect_type, l.is_active, l.is_one_time,
            l.is_consumed, l.consumed_at, l.expires_at, l.created_by, l.created_at, l.updated_at,
            (l.password_hash IS NOT NULL) as is_protected,
            COALESCE(COUNT(c.id), 0)::int as click_count
          FROM links l
          LEFT JOIN click_events c ON c.link_id = l.id
          WHERE l.user_id = ${tenant.user_id} AND l.workspace_id = ${workspaceId}
          GROUP BY l.id
          ORDER BY l.created_at DESC
        `
      } else {
        queryResult = await sql`
          SELECT 
            l.id, l.user_id, l.workspace_id, l.title, l.description, l.destination_url,
            l.short_code, l.custom_slug, l.redirect_type, l.is_active, l.is_one_time,
            l.is_consumed, l.consumed_at, l.expires_at, l.created_by, l.created_at, l.updated_at,
            (l.password_hash IS NOT NULL) as is_protected,
            COALESCE(COUNT(c.id), 0)::int as click_count
          FROM links l
          LEFT JOIN click_events c ON c.link_id = l.id
          WHERE l.user_id = ${tenant.user_id}
          GROUP BY l.id
          ORDER BY l.created_at DESC
        `
      }
      return queryResult
    })

    return c.json(links)
  } catch (err: any) {
    return c.json([])
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

    await withTenantDb(dbUrl, tenant.user_id, async (sql) => {
      const existing = await sql`
        SELECT short_code, custom_slug FROM links WHERE id = ${linkId} AND user_id = ${tenant.user_id} LIMIT 1
      `
      if (existing.length > 0) {
        shortCodeToDelete = existing[0].short_code
        customSlugToDelete = existing[0].custom_slug

        await sql`
          DELETE FROM links WHERE id = ${linkId} AND user_id = ${tenant.user_id}
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
