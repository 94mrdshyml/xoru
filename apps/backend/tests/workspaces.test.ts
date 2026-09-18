import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Workspaces API Endpoints', () => {
  it('GET /api/v1/workspaces requires authentication', async () => {
    const res = await app.request('/api/v1/workspaces')
    expect(res.status).toBe(401)
  })

  it('GET /api/v1/workspaces returns workspaces array for authenticated user', async () => {
    const res = await app.request('/api/v1/workspaces', {
      headers: {
        'X-Tenant-Id': 'usr_test_workspace_user',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBeGreaterThan(0)
    expect(json[0]).toHaveProperty('id')
    expect(json[0]).toHaveProperty('name')
  })

  it('POST /api/v1/workspaces validates input and creates workspace', async () => {
    const res = await app.request('/api/v1/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_workspace_user',
      },
      body: JSON.stringify({
        name: 'New Client Workspace',
        logo_url: 'https://example.com/logo.png',
      }),
    })
    expect(res.status).toBe(201)
    const json = await res.json<any>()
    expect(json.name).toBe('New Client Workspace')
    expect(json.logo_url).toBe('https://example.com/logo.png')
    expect(json.id).toMatch(/^wrk_/)
  })

  it('POST /api/v1/workspaces rejects empty name', async () => {
    const res = await app.request('/api/v1/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_workspace_user',
      },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/v1/workspaces/:id updates workspace details in dev mode', async () => {
    const res = await app.request('/api/v1/workspaces/wrk_test123', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'usr_test_workspace_user',
      },
      body: JSON.stringify({
        name: 'Updated Workspace Name',
      }),
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json.name).toBe('Updated Workspace Name')
  })

  it('DELETE /api/v1/workspaces/:id deletes workspace in dev mode', async () => {
    const res = await app.request('/api/v1/workspaces/wrk_test123', {
      method: 'DELETE',
      headers: {
        'X-Tenant-Id': 'usr_test_workspace_user',
      },
    })
    expect(res.status).toBe(200)
    const json = await res.json<any>()
    expect(json.success).toBe(true)
  })
})
