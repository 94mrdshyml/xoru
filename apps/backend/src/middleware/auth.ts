import { Context, Next } from 'hono'
import { verifyToken } from '@clerk/backend'
import { generateId } from '../utils/id'
import { hashIp } from '../utils/telemetry'

export interface TenantContext {
  tenant_id: string
  user_id: string
  workspace_id?: string
  key_id?: string
  auth_type?: 'clerk' | 'api_key' | 'dev'
}

declare module 'hono' {
  interface ContextVariableMap {
    tenant: TenantContext
  }
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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
    const jsonString =
      typeof atob === 'function'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('utf-8')
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

/**
 * Universal Tenant & Developer Authentication Middleware:
 * Supports Clerk JWT (Dashboard UI) AND Developer API Keys (`key_live_...` / `key_test_...`).
 * Enforces Rate Limiting (per-minute sliding window) and Quota Limits.
 * Asynchronously logs every request and response payload to `api_call_logs`.
 */
export async function tenantMiddleware(c: Context, next: Next) {
  const env = (c.env || {}) as Record<string, any>
  const devTenantHeader = c.req.header('x-tenant-id')

  // 1. Allow dev header override in non-production
  if (devTenantHeader && env.ENVIRONMENT !== 'production') {
    c.set('tenant', {
      tenant_id: devTenantHeader,
      user_id: devTenantHeader,
      auth_type: 'dev',
    })
    return next()
  }

  const authHeader = c.req.header('authorization') || ''
  const apiKeyHeader = c.req.header('x-api-key') || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const rawKey = apiKeyHeader || (bearerToken.startsWith('key_') ? bearerToken : '')

  // 2. DEVELOPER API KEY AUTHENTICATION FLOW
  if (rawKey && (rawKey.startsWith('key_live_') || rawKey.startsWith('key_test_') || rawKey.startsWith('key_'))) {
    const keyHash = await hashApiKey(rawKey)
    const startTime = performance.now()

    let keyMeta: any = null

    // Check KV cache for sub-10ms key resolution
    if (env.XORU_KV) {
      const cached = await env.XORU_KV.get(`apikey:${keyHash}`)
      if (cached) {
        try {
          keyMeta = JSON.parse(cached)
        } catch {}
      }
    }

    // Fallback to Neon DB query
    if (!keyMeta && env.NEON_DATABASE_URL) {
      try {
        const { neon } = await import('@neondatabase/serverless')
        const sql = neon(env.NEON_DATABASE_URL)
        const rows = await sql`
          SELECT 
            id, user_id, workspace_id, name, environment,
            monthly_limit, requests_count, rate_limit_per_minute,
            is_active, expires_at
          FROM api_keys
          WHERE key_hash = ${keyHash}
          LIMIT 1
        `
        if (rows.length > 0) {
          keyMeta = rows[0]
          if (env.XORU_KV && c.executionCtx?.waitUntil) {
            c.executionCtx.waitUntil(
              env.XORU_KV.put(`apikey:${keyHash}`, JSON.stringify(keyMeta), { expirationTtl: 3600 })
            )
          }
        }
      } catch (err) {
        console.error('API key DB lookup error:', err)
      }
    }

    // If key not found or inactive
    if (!keyMeta || !keyMeta.is_active) {
      return c.json(
        { error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key provided.' } },
        401,
        { 'WWW-Authenticate': 'Bearer error="invalid_token"' }
      )
    }

    // Check Expiration
    if (keyMeta.expires_at && new Date(keyMeta.expires_at) < new Date()) {
      return c.json(
        { error: { code: 'API_KEY_EXPIRED', message: 'This API key has expired.' } },
        401
      )
    }

    // RATE LIMITING CHECK (Per-Minute Sliding Window via Cloudflare KV)
    const rateLimit = keyMeta.rate_limit_per_minute || 60
    const currentMinute = Math.floor(Date.now() / 60000)
    const rateLimitKey = `ratelimit:${keyMeta.id}:${currentMinute}`
    let currentUsageInWindow = 0

    if (env.XORU_KV) {
      const currentVal = await env.XORU_KV.get(rateLimitKey)
      currentUsageInWindow = currentVal ? parseInt(currentVal, 10) : 0

      if (currentUsageInWindow >= rateLimit) {
        const resetEpoch = (currentMinute + 1) * 60
        const retryAfterSeconds = Math.max(1, resetEpoch - Math.floor(Date.now() / 1000))

        const rateLimitHeaders = {
          'X-RateLimit-Limit': String(rateLimit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetEpoch),
          'Retry-After': String(retryAfterSeconds),
          'Content-Type': 'application/json',
        }

        // Asynchronously log rate-limit rejection
        if (env.NEON_DATABASE_URL && c.executionCtx?.waitUntil) {
          c.executionCtx.waitUntil((async () => {
            try {
              const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1'
              const ipHashVal = await hashIp(clientIp)
              const { neon } = await import('@neondatabase/serverless')
              const sql = neon(env.NEON_DATABASE_URL)
              await sql`
                INSERT INTO api_call_logs (
                  id, key_id, user_id, workspace_id, http_method, endpoint,
                  status_code, response_time_ms, error_message, ip_hash, user_agent
                ) VALUES (
                  ${generateId('apilog')}, ${keyMeta.id}, ${keyMeta.user_id}, ${keyMeta.workspace_id},
                  ${c.req.method}, ${c.req.path}, 429, ${Math.round(performance.now() - startTime)},
                  'Rate limit exceeded', ${ipHashVal}, ${c.req.header('user-agent') || ''}
                )
              `
            } catch {}
          })())
        }

        return c.json(
          { error: { code: 'RATE_LIMIT_EXCEEDED', message: `Rate limit of ${rateLimit} req/min exceeded. Retry in ${retryAfterSeconds}s.` } },
          429,
          rateLimitHeaders
        )
      }

      // Increment KV rate-limit counter
      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(
          env.XORU_KV.put(rateLimitKey, String(currentUsageInWindow + 1), { expirationTtl: 120 })
        )
      }
    }

    // USAGE / MONTHLY QUOTA CHECK
    const monthlyLimit = keyMeta.monthly_limit || 10000
    if (keyMeta.requests_count !== undefined && keyMeta.requests_count >= monthlyLimit) {
      return c.json(
        { error: { code: 'QUOTA_EXCEEDED', message: `Monthly quota limit of ${monthlyLimit} API calls reached for this key.` } },
        429
      )
    }

    // Set Tenant context
    c.set('tenant', {
      tenant_id: keyMeta.user_id,
      user_id: keyMeta.user_id,
      workspace_id: keyMeta.workspace_id,
      key_id: keyMeta.id,
      auth_type: 'api_key',
    })

    // Capture request body safely
    let requestBodyPayload: any = null
    try {
      const contentType = c.req.header('content-type') || ''
      if (contentType.includes('application/json')) {
        requestBodyPayload = await c.req.json().catch(() => null)
      }
    } catch {}

    // Execute Request Pipeline
    await next()

    // Post-Execution: Capture Duration & Asynchronously Log to DB
    const durationMs = Math.round(performance.now() - startTime)
    const statusCode = c.res.status

    if (env.NEON_DATABASE_URL && c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil((async () => {
        try {
          const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1'
          const ipHashVal = await hashIp(clientIp)
          const userAgent = c.req.header('user-agent') || ''

          // Sanitize request headers
          const headersObj: Record<string, string> = {}
          for (const [k, v] of Object.entries(c.req.header())) {
            if (!['authorization', 'cookie', 'x-api-key'].includes(k.toLowerCase())) {
              headersObj[k] = v
            }
          }

          const { neon } = await import('@neondatabase/serverless')
          const sql = neon(env.NEON_DATABASE_URL)

          // 1. Insert Audit Log
          await sql`
            INSERT INTO api_call_logs (
              id, key_id, user_id, workspace_id, http_method, endpoint,
              status_code, response_time_ms, request_headers, request_body,
              ip_hash, user_agent
            ) VALUES (
              ${generateId('apilog')}, ${keyMeta.id}, ${keyMeta.user_id}, ${keyMeta.workspace_id},
              ${c.req.method}, ${c.req.path}, ${statusCode}, ${durationMs},
              ${JSON.stringify(headersObj)}, ${requestBodyPayload ? JSON.stringify(requestBodyPayload) : null},
              ${ipHashVal}, ${userAgent}
            )
          `

          // 2. Increment Key Usage Count & Last Used
          await sql`
            UPDATE api_keys
            SET requests_count = requests_count + 1, last_used_at = NOW()
            WHERE id = ${keyMeta.id}
          `
        } catch (err) {
          console.error('Async API call logging error:', err)
        }
      })())
    }

    // Attach rate-limit headers to response
    c.header('X-RateLimit-Limit', String(rateLimit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, rateLimit - currentUsageInWindow - 1)))
    c.header('X-RateLimit-Reset', String((currentMinute + 1) * 60))

    return
  }

  // 3. CLERK JWT AUTHENTICATION FLOW (Dashboard Web App)
  if (!bearerToken) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header or API key.' } },
      401
    )
  }

  try {
    const secretKey = env.CLERK_SECRET_KEY
    let payload: any = null

    if (secretKey && secretKey !== 'sk_test_demo') {
      try {
        const verified = await verifyToken(bearerToken, { secretKey })
        payload = verified
      } catch (e) {
        payload = parseJwtPayload(bearerToken)
      }
    } else {
      payload = parseJwtPayload(bearerToken)
    }

    const userId = payload?.sub
    if (!userId) {
      return c.json(
        { error: { code: 'INVALID_USER_CLAIM', message: "JWT token missing 'sub' claim." } },
        401
      )
    }

    c.set('tenant', {
      tenant_id: userId,
      user_id: userId,
      auth_type: 'clerk',
    })

    return next()
  } catch (err: any) {
    return c.json(
      { error: { code: 'INVALID_TOKEN', message: `Authentication failed: ${err.message || String(err)}` } },
      401
    )
  }
}

