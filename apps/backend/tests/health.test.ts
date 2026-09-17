import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Backend API Routes', () => {
  it('GET / returns 200 and healthy status', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      status: 'healthy',
      service: 'xoru-backend',
    })
  })

  it('GET /api/v1/health returns 200 and healthy status', async () => {
    const res = await app.request('/api/v1/health')
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      status: 'healthy',
      service: 'xoru-backend',
      tagline: 'Short Link. Real Intelligence.',
      framework: 'Hono.js (TypeScript)',
    })
  })

  it('GET /api/v1/auth/me rejects missing Authorization header', async () => {
    const res = await app.request('/api/v1/auth/me')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/auth/me accepts X-Tenant-Id header in development mode', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: {
        'X-Tenant-Id': 'usr_test_123456789012345678901234',
      },
    })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({
      tenant_id: 'usr_test_123456789012345678901234',
      user_id: 'usr_test_123456789012345678901234',
    })
  })

  it('GET /nonexistent_slug returns 404', async () => {
    const res = await app.request('/nonexistent_slug')
    expect(res.status).toBe(404)

    const data = (await res.json()) as { error: { code: string } }
    expect(data.error.code).toBe('LINK_NOT_FOUND')
  })
})
