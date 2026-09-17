import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { generateShortCode } from '../src/utils/base62'

describe('Base62 Generator', () => {
  it('generates a 7-character base62 string by default', () => {
    const code = generateShortCode()
    expect(code).toHaveLength(7)
    expect(code).toMatch(/^[0-9a-zA-Z]{7}$/)
  })

  it('generates unique codes', () => {
    const set = new Set<string>()
    for (let i = 0; i < 100; i++) {
      set.add(generateShortCode())
    }
    expect(set.size).toBe(100)
  })
})

describe('Short Link API Endpoints', () => {
  it('POST /api/v1/links validates missing required fields', async () => {
    const res = await app.request('/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'org_test_123',
      },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/v1/links validates invalid URL format', async () => {
    const res = await app.request('/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'org_test_123',
      },
      body: JSON.stringify({
        workspace_id: 'wrk_test_123',
        title: 'Invalid URL Test',
        destination_url: 'not-a-valid-url',
      }),
    })
    expect(res.status).toBe(400)
    const data = (await res.json()) as { error: { code: string } }
    expect(data.error.code).toBe('INVALID_URL')
  })

  it('POST /api/v1/links creates short link object successfully', async () => {
    const res = await app.request('/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'org_test_123',
      },
      body: JSON.stringify({
        workspace_id: 'wrk_test_123',
        title: 'Xoru GitHub Repository',
        destination_url: 'https://github.com',
        custom_slug: 'xoru-repo',
      }),
    })
    expect(res.status).toBe(201)

    const data = (await res.json()) as any
    expect(data.id).toMatch(/^lnk_/)
    expect(data.org_id).toBe('org_test_123')
    expect(data.short_code).toHaveLength(7)
    expect(data.custom_slug).toBe('xoru-repo')
    expect(data.destination_url).toBe('https://github.com')
  })
})

