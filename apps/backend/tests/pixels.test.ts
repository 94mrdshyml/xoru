import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Pixels & Tracking API Endpoints', () => {
  it('GET /x.js serves first-party JavaScript tracker with correct content type and caching', async () => {
    const res = await app.request('/x.js')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/javascript')
    expect(res.headers.get('cache-control')).toContain('public')
    const text = await res.text()
    expect(text).toContain('window.xoru')
    expect(text).toContain('data-pixel')
  })

  it('GET /p/:id.gif serves 1x1 transparent GIF image', async () => {
    const res = await app.request('/p/pxl_test_123.gif')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/gif')
    const arrayBuffer = await res.arrayBuffer()
    expect(arrayBuffer.byteLength).toBe(42)
  })

  it('POST /api/v1/pixels/track validates missing pixel_id', async () => {
    const res = await app.request('/api/v1/pixels/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const json = await res.json<any>()
    expect(json.error.code).toBe('INVALID_REQUEST')
  })

  it('POST /api/v1/pixels/track accepts valid telemetry payload', async () => {
    const res = await app.request('/api/v1/pixels/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      },
      body: JSON.stringify({
        pixel_id: 'pxl_test_tracker',
        event_name: 'signup',
        event_data: { plan: 'growth' },
        page_url: 'https://example.com/pricing',
      }),
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json.success).toBe(true)
  })

  it('GET /api/v1/pixels requires authentication', async () => {
    const res = await app.request('/api/v1/pixels')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/pixels returns list for authenticated user', async () => {
    const res = await app.request('/api/v1/pixels', {
      headers: { 'X-Tenant-Id': 'usr_test_user' },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(Array.isArray(json)).toBe(true)
  })

  it('POST /api/v1/pixels validates and provisions pixel in dev mode', async () => {
    const res = await app.request('/api/v1/pixels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_user',
      },
      body: JSON.stringify({
        platform: 'xoru',
        name: 'Main Website Tracker',
      }),
    })
    expect(res.status).toBe(201)
    const json = await res.json<any>()
    expect(json).toHaveProperty('id')
    expect(json.name).toBe('Main Website Tracker')
    expect(json.platform).toBe('xoru')
  })

  it('POST /api/v1/pixels provisions third-party Meta pixel', async () => {
    const res = await app.request('/api/v1/pixels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_user',
      },
      body: JSON.stringify({
        platform: 'meta',
        name: 'Facebook Ad Retargeting',
        pixel_id: '98273612847192',
      }),
    })
    expect(res.status).toBe(201)
    const json = await res.json<any>()
    expect(json.platform).toBe('meta')
    expect(json.pixel_id).toBe('98273612847192')
  })
})
