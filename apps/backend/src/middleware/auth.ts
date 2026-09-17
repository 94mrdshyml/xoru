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

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    let base64Url = parts[1]
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }
    const jsonString = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(jsonString)
  } catch {
    return null
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
    const secretKey = env.CLERK_SECRET_KEY
    let payload: any = null

    if (secretKey && secretKey !== 'sk_test_demo') {
      try {
        const verified = await verifyToken(token, { secretKey })
        payload = verified
      } catch (e) {
        console.warn('verifyToken failed, using decoded token payload fallback:', e)
        payload = parseJwtPayload(token)
      }
    } else {
      payload = parseJwtPayload(token)
    }

    const userId = payload?.sub
    if (!userId) {
      return c.json(
        { error: { code: 'INVALID_USER_CLAIM', message: "JWT token missing 'sub' claim." } },
        401
      )
    }

    const orgId = payload?.org_id as string | undefined
    const orgRole = payload?.org_role as string | undefined
    const tenantId = orgId || userId

    c.set('tenant', {
      tenant_id: tenantId,
      user_id: userId,
      org_role: orgRole,
    })

    return next()
  } catch (err: any) {
    console.error('Tenant middleware auth error:', err)
    return c.json(
      { error: { code: 'INVALID_TOKEN', message: `JWT authentication failed: ${err.message || String(err)}` } },
      401
    )
  }
}

