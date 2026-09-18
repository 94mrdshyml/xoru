import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Analytics API Endpoints', () => {
  it('GET /api/v1/analytics requires authentication', async () => {
    const res = await app.request('/api/v1/analytics')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/analytics returns default structure when no DB is attached in dev', async () => {
    const res = await app.request('/api/v1/analytics', {
      headers: {
        'X-Tenant-Id': 'usr_test_tenant',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json).toHaveProperty('total_clicks')
    expect(json).toHaveProperty('unique_visitors')
    expect(json).toHaveProperty('clicks_by_date')
    expect(json).toHaveProperty('top_devices')
    expect(json).toHaveProperty('top_countries')
    expect(json).toHaveProperty('top_referrers')
  })
})

