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

// Health check endpoints (both root / and /api/v1/health)
app.get('/', healthHandler)
app.get('/api/v1/health', healthHandler)

// Authenticated user context endpoint
app.get('/api/v1/auth/me', tenantMiddleware, (c) => {
  const tenant = c.get('tenant')
  return c.json({
    tenant_id: tenant.tenant_id,
    user_id: tenant.user_id,
    org_role: tenant.org_role || null,
  })
})

// Workspace onboarding endpoint
app.post('/api/v1/workspaces/onboard', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const body = await c.req.json<{
    first_name: string
    last_name?: string
    email: string
    workspace_name: string
  }>()

  if (!body.first_name || !body.workspace_name) {
    return c.json(
      { error: { code: 'INVALID_INPUT', message: 'first_name and workspace_name are required.' } },
      400
    )
  }

  const orgId = tenant.tenant_id
  const orgName = `${body.first_name}'s Organization`
  const orgSlug = `org-${body.first_name.toLowerCase()}-${generateId('org').slice(4, 10)}`

  const workspaceId = generateId('wrk')
  const slugBase = body.first_name.toLowerCase().replace(/\s+/g, '-')
  const workspaceSlug = `${slugBase}-workspace-${workspaceId.slice(4, 10)}`

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (dbUrl) {
    await withTenantDb(dbUrl, orgId, async (sql) => {
      // 1. Provision Organization
      await sql`
        INSERT INTO organizations (id, name, slug)
        VALUES (${orgId}, ${orgName}, ${orgSlug})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `
      // 2. Provision Default Workspace under Organization
      await sql`
        INSERT INTO workspaces (id, org_id, name, slug)
        VALUES (${workspaceId}, ${orgId}, ${body.workspace_name}, ${workspaceSlug})
      `
    })
  }

  return c.json({
    id: workspaceId,
    org_id: orgId,
    name: body.workspace_name,
    slug: workspaceSlug,
  }, 201)
})

// Public Short Link Redirection Endpoint (Sub-10ms Cloudflare KV lookup)
app.get('/:code_or_slug', async (c) => {
  const code = c.req.param('code_or_slug')

  if (['health', 'docs', 'favicon.ico'].includes(code)) {
    return c.redirect('/api/v1/health')
  }

  // 1. Try Cloudflare KV lookup
  if (c.env?.XORU_KV) {
    const targetUrl = await c.env.XORU_KV.get(`lnk:${code}`)
    if (targetUrl) {
      return c.redirect(targetUrl, 302)
    }
  }

  return c.json(
    { error: { code: 'LINK_NOT_FOUND', message: `Short link '${code}' not found.` } },
    404
  )
})

export type AppType = typeof app
export default app

