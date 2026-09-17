import { Context, Next } from 'hono'
import { verifyToken } from '@clerk/backend'

export interface TenantContext {
  tenant_id: string
  user_id: string
  org_role?: string
}

declare module 'hono' {
  interface ContextVariableMap {
    tenant: TenantContext
  }
}

/**
 * Middleware extracting Clerk Organization (tenant_id) and User ID.
 * In development/testing, accepts X-Tenant-Id override header.
 */
export async function tenantMiddleware(c: Context, next: Next) {
  const env = (c.env || {}) as Record<string, string>
  const devTenantHeader = c.req.header('x-tenant-id')

  // Allow dev header override when running non-production
  if (devTenantHeader && env.ENVIRONMENT !== 'production') {
    c.set('tenant', {
      tenant_id: devTenantHeader,
      user_id: 'usr_dev_admin',
      org_role: 'admin',
    })
    return next()
  }

  const authHeader = c.req.header('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Bearer Authorization header.' } },
      401
    )
  }

  const token = authHeader.split(' ')[1]

  try {
    const secretKey = env.CLERK_SECRET_KEY || 'sk_test_demo'
    const verified = await verifyToken(token, { secretKey })
    
    const userId = verified.sub
    if (!userId) {
      return c.json(
        { error: { code: 'INVALID_USER_CLAIM', message: "JWT token missing 'sub' claim." } },
        401
      )
    }

    const orgId = verified.org_id as string | undefined
    const orgRole = verified.org_role as string | undefined
    const tenantId = orgId || userId

    c.set('tenant', {
      tenant_id: tenantId,
      user_id: userId,
      org_role: orgRole,
    })

    return next()
  } catch (err: any) {
    return c.json(
      { error: { code: 'INVALID_TOKEN', message: `JWT verification failed: ${err.message || String(err)}` } },
      401
    )
  }
}

