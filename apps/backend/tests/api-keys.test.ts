import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { hashApiKey } from '../src/middleware/auth'

describe('Developer API Keys, Rate Limiting & Audit Logging Endpoints', () => {
  it('hashApiKey correctly hashes raw secret key deterministically using SHA-256', async () => {
    const hash1 = await hashApiKey('key_live_testsecret12345678901234567890')
    const hash2 = await hashApiKey('key_live_testsecret12345678901234567890')
    const hash3 = await hashApiKey('key_live_differentsecret1234567890123456')

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash1.length).toBe(64)
  })

  it('GET /api/v1/api-keys requires authentication', async () => {
    const res = await app.request('/api/v1/api-keys')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/api-keys returns list for authenticated user', async () => {
    const res = await app.request('/api/v1/api-keys', {
      headers: { 'X-Tenant-Id': 'usr_test_dev' },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(Array.isArray(json)).toBe(true)
  })

  it('POST /api/v1/api-keys provisions new API key and returns raw secret once', async () => {
    const res = await app.request('/api/v1/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_dev',
      },
      body: JSON.stringify({
        name: 'Zapier Integration',
        environment: 'live',
        monthly_limit: 5000,
        rate_limit_per_minute: 120,
      }),
    })
    expect(res.status).toBe(201)
    const json = await res.json<any>()
    expect(json).toHaveProperty('id')
    expect(json).toHaveProperty('key_secret')
    expect(json.key_secret).toMatch(/^key_live_/)
    expect(json.name).toBe('Zapier Integration')
    expect(json.monthly_limit).toBe(5000)
    expect(json.rate_limit_per_minute).toBe(120)
  })

  it('GET /api/v1/api-keys/logs returns request/response audit logs list', async () => {
    const res = await app.request('/api/v1/api-keys/logs', {
      headers: { 'X-Tenant-Id': 'usr_test_dev' },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(Array.isArray(json)).toBe(true)
  })

  it('GET /api/v1/api-keys/usage returns usage-based billing metrics', async () => {
    const res = await app.request('/api/v1/api-keys/usage', {
      headers: { 'X-Tenant-Id': 'usr_test_dev' },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json).toHaveProperty('total_requests')
    expect(json).toHaveProperty('monthly_limit')
    expect(json).toHaveProperty('usage_percent')
  })
})
