import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { generateShortCode } from '../src/utils/base62'
import { generateSalt, hashPassword, verifyPassword } from '../src/utils/crypto'

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

describe('Crypto Utilities', () => {
  it('generates a random hex salt', () => {
    const salt = generateSalt(16)
    expect(salt).toHaveLength(32)
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('correctly hashes and verifies passwords', async () => {
    const salt = generateSalt(16)
    const password = 'mySecretPassword123!'
    const hash = await hashPassword(password, salt)

    expect(hash).toHaveLength(64) // SHA-256 hex string
    const valid = await verifyPassword(password, salt, hash)
    expect(valid).toBe(true)

    const invalid = await verifyPassword('wrongPassword', salt, hash)
    expect(invalid).toBe(false)
  })
})

describe('Short Link API Endpoints', () => {
  it('POST /api/v1/links validates missing required fields', async () => {
    const res = await app.request('/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_123',
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
        'X-Tenant-Id': 'usr_test_123',
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
        'X-Tenant-Id': 'usr_test_123',
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
    expect(data.user_id).toBe('usr_test_123')
    expect(data.short_code).toHaveLength(7)
    expect(data.custom_slug).toBe('xoru-repo')
    expect(data.destination_url).toBe('https://github.com')
  })

  it('POST /api/v1/links creates password-protected, one-time link with expiry and description', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const res = await app.request('/api/v1/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_123',
      },
      body: JSON.stringify({
        workspace_id: 'wrk_test_123',
        title: 'Confidential Investor Memo',
        description: 'Internal Q4 investor deck with one-time burn',
        destination_url: 'https://example.com/investor-memo',
        password: 'investorSecret2026',
        is_one_time: true,
        expires_at: futureDate,
      }),
    })
    expect(res.status).toBe(201)

    const data = (await res.json()) as any
    expect(data.title).toBe('Confidential Investor Memo')
    expect(data.description).toBe('Internal Q4 investor deck with one-time burn')
    expect(data.is_protected).toBe(true)
    expect(data.is_one_time).toBe(true)
    expect(data.is_consumed).toBe(false)
    expect(data.expires_at).toBe(futureDate)
    expect(data.password_hash).toBeUndefined() // never exposed
    expect(data.password_salt).toBeUndefined()
  })
})
