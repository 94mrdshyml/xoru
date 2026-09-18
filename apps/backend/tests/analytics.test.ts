import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Analytics API Endpoints', () => {
  it('GET /api/v1/analytics requires authentication', async () => {
    const res = await app.request('/api/v1/analytics')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/analytics enforces workspace_id requirement when link_id is absent', async () => {
    const res = await app.request('/api/v1/analytics', {
      headers: {
        'X-Tenant-Id': 'usr_test_tenant',
      },
    })
    expect(res.status).toBe(400)
    const json = await res.json<any>()
    expect(json.error.code).toBe('MISSING_WORKSPACE_ID')
  })

  it('GET /api/v1/analytics returns default structure when workspace_id is provided', async () => {
    const res = await app.request('/api/v1/analytics?workspace_id=wrk_test_123', {
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

  it('GET /api/v1/analytics returns 200 when link_id is provided without workspace_id (link-specific exception)', async () => {
    const res = await app.request('/api/v1/analytics?link_id=lnk_test_123', {
      headers: {
        'X-Tenant-Id': 'usr_test_tenant',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json).toHaveProperty('total_clicks')
  })

  it('GET /api/v1/analytics accepts X-Workspace-Id header', async () => {
    const res = await app.request('/api/v1/analytics', {
      headers: {
        'X-Tenant-Id': 'usr_test_tenant',
        'X-Workspace-Id': 'wrk_test_header',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json).toHaveProperty('total_clicks')
  })
})
