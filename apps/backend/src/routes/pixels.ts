import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/auth'
import { generateId } from '../utils/id'
import { extractTelemetry } from '../utils/telemetry'

type Bindings = {
  XORU_KV: KVNamespace
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  ENVIRONMENT: string
}

export const pixelsRouter = new Hono<{ Bindings: Bindings }>()

// Standard 43-byte 1x1 transparent GIF
export const TRANSPARENT_GIF_BUFFER = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x01, 0x44, 0x00, 0x3b
])

// -----------------------------------------------------------------------------
// 1. PUBLIC TRACKER SCRIPT: GET /x.js
// -----------------------------------------------------------------------------
export function getTrackerScript(backendOrigin: string): string {
  return `(function(){
  try {
    var d=document,w=window;
    var s=d.currentScript||d.querySelector('script[data-pixel]');
    var p=s?s.getAttribute('data-pixel'):null;
    var ep=s?(s.getAttribute('data-endpoint')||('${backendOrigin}/api/v1/pixels/track')):'${backendOrigin}/api/v1/pixels/track';
    
    function send(name,data){
      if(!p)return;
      var pl={
        pixel_id:p,
        event_name:name||'pageview',
        event_data:data||{},
        page_url:w.location.href,
        referrer:d.referrer||'',
        title:d.title||'',
        screen:(w.screen?w.screen.width+'x'+w.screen.height:''),
        timestamp:new Date().toISOString()
      };
      try{
        var q=new URLSearchParams(w.location.search);
        var cid=q.get('_xoru_cid')||q.get('ref')||q.get('utm_source');
        if(cid)pl.cid=cid;
      }catch(e){}
      var j=JSON.stringify(pl);
      if(navigator.sendBeacon){
        navigator.sendBeacon(ep,new Blob([j],{type:'application/json'}));
      }else{
        fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:j,mode:'cors',keepalive:true}).catch(function(){});
      }
    }

    window.xoru=window.xoru||{
      track:function(n,d){send(n,d);},
      page:function(n,d){send(n||'pageview',d);},
      identify:function(u,t){send('identify',{user_id:u,traits:t});}
    };

    if(window.xoru._q&&Array.isArray(window.xoru._q)){
      for(var i=0;i<window.xoru._q.length;i++){
        var it=window.xoru._q[i];
        if(it&&it.length)send(it[0],it[1]);
      }
      window.xoru._q=[];
    }

    send('pageview');
  }catch(e){}
})();`
}

// -----------------------------------------------------------------------------
// 2. PUBLIC INGESTION COLLECTOR: POST /api/v1/pixels/track
// -----------------------------------------------------------------------------
pixelsRouter.post('/track', async (c) => {
  try {
    const body = await c.req.json<{
      pixel_id?: string
      event_name?: string
      event_data?: Record<string, any>
      page_url?: string
      referrer?: string
      title?: string
      cid?: string
    }>().catch(() => ({} as any))

    const pixelId = body.pixel_id
    if (!pixelId) {
      return c.json({ error: { code: 'INVALID_REQUEST', message: 'Missing pixel_id.' } }, 400)
    }

    const eventName = (body.event_name || 'pageview').slice(0, 64)
    const eventData = body.event_data || {}
    const pageUrl = body.page_url || ''
    const referrer = body.referrer || c.req.header('referer') || c.req.header('referrer') || ''

    const dbUrl = c.env?.NEON_DATABASE_URL
    if (dbUrl && c.executionCtx?.waitUntil) {
      c.executionCtx.waitUntil((async () => {
        try {
          const telemetry = await extractTelemetry(c.req.raw, new URL(c.req.url))
          const { neon } = await import('@neondatabase/serverless')
          const sql = neon(dbUrl)

          // Verify pixel and get workspace / user details
          const pixelRows = await sql`
            SELECT id, user_id, workspace_id, link_id, is_active
            FROM retargeting_pixels
            WHERE id = ${pixelId} OR pixel_id = ${pixelId}
            LIMIT 1
          `

          if (pixelRows.length === 0 || !pixelRows[0].is_active) {
            return
          }

          const pixel = pixelRows[0]
          const eventId = generateId('pxevt')

          await sql`
            INSERT INTO pixel_events (
              id, pixel_id, workspace_id, user_id, link_id,
              event_name, event_data, page_url, referrer,
              device_type, browser, os, country, city, ip_hash
            ) VALUES (
              ${eventId},
              ${pixel.id},
              ${pixel.workspace_id},
              ${pixel.user_id},
              ${pixel.link_id || null},
              ${eventName},
              ${JSON.stringify(eventData)},
              ${pageUrl},
              ${referrer},
              ${telemetry.device_type},
              ${telemetry.browser},
              ${telemetry.os},
              ${telemetry.country},
              ${telemetry.city},
              ${telemetry.ip_hash}
            )
          `
        } catch (err) {
          console.error('Async pixel telemetry ingestion error:', err)
        }
      })())
    }

    return c.json({ success: true, recorded: true }, 200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: err.message || String(err) } }, 500)
  }
})

// Options preflight for tracker endpoint
pixelsRouter.options('/track', (c) => {
  return c.text('', 204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
})

// -----------------------------------------------------------------------------
// 3. AUTHENTICATED PIXEL MANAGEMENT CRUD
// -----------------------------------------------------------------------------

// GET /api/v1/pixels - List pixels in active workspace
pixelsRouter.get('/', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const workspaceId = c.req.query('workspace_id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    // Development fallback
    return c.json([
      {
        id: 'pxl_xoru_default',
        user_id: tenant.user_id,
        workspace_id: workspaceId || 'wrk_default',
        name: 'Workspace Tracking Pixel',
        platform: 'xoru',
        pixel_id: 'pxl_xoru_default',
        is_active: true,
        events_count: 0,
        created_at: new Date().toISOString(),
      },
    ])
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)

    let rows
    if (workspaceId) {
      rows = await sql`
        SELECT 
          p.id, p.user_id, p.workspace_id, p.link_id, p.name, p.platform, p.pixel_id, p.is_active, p.created_at,
          COUNT(e.id)::int AS events_count
        FROM retargeting_pixels p
        LEFT JOIN pixel_events e ON e.pixel_id = p.id
        WHERE p.user_id = ${tenant.user_id} AND p.workspace_id = ${workspaceId}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
    } else {
      rows = await sql`
        SELECT 
          p.id, p.user_id, p.workspace_id, p.link_id, p.name, p.platform, p.pixel_id, p.is_active, p.created_at,
          COUNT(e.id)::int AS events_count
        FROM retargeting_pixels p
        LEFT JOIN pixel_events e ON e.pixel_id = p.id
        WHERE p.user_id = ${tenant.user_id}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `
    }

    return c.json(rows)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// POST /api/v1/pixels - Provision a new pixel (Xoru native or 3rd-party)
pixelsRouter.post('/', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const body = await c.req.json<{
    name?: string
    platform: 'xoru' | 'meta' | 'google' | 'tiktok' | 'twitter' | 'linkedin' | 'custom'
    pixel_id?: string
    workspace_id?: string
    link_id?: string
  }>().catch(() => ({} as any))

  if (!body.platform) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'Platform is required.' } }, 400)
  }

  const platform = body.platform
  const name = (body.name && body.name.trim()) ? body.name.trim() : `${platform.toUpperCase()} Pixel`
  const workspaceId = body.workspace_id
  const linkId = body.link_id || null

  const id = generateId('pxl')
  // For native Xoru pixels, pixel_id is the primary ID unless provided
  const pixelId = (platform === 'xoru' && !body.pixel_id) ? id : (body.pixel_id?.trim() || id)

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({
      id,
      user_id: tenant.user_id,
      workspace_id: workspaceId || 'wrk_default',
      link_id: linkId,
      name,
      platform,
      pixel_id: pixelId,
      is_active: true,
      events_count: 0,
      created_at: new Date().toISOString(),
    }, 201)
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)

    // Ensure effective workspace
    let effectiveWorkspaceId = workspaceId
    if (!effectiveWorkspaceId) {
      const wrkRows = await sql`SELECT id FROM workspaces WHERE user_id = ${tenant.user_id} LIMIT 1`
      if (wrkRows.length > 0) {
        effectiveWorkspaceId = wrkRows[0].id
      } else {
        const newWrkId = generateId('wrk')
        await sql`
          INSERT INTO workspaces (id, user_id, name, slug)
          VALUES (${newWrkId}, ${tenant.user_id}, 'Personal Workspace', ${'wrk-personal-' + newWrkId.slice(4, 10)})
        `
        effectiveWorkspaceId = newWrkId
      }
    }

    const rows = await sql`
      INSERT INTO retargeting_pixels (
        id, user_id, workspace_id, link_id, name, platform, pixel_id, is_active
      ) VALUES (
        ${id}, ${tenant.user_id}, ${effectiveWorkspaceId}, ${linkId}, ${name}, ${platform}, ${pixelId}, TRUE
      )
      RETURNING id, user_id, workspace_id, link_id, name, platform, pixel_id, is_active, created_at
    `

    return c.json({ ...rows[0], events_count: 0 }, 201)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// PATCH /api/v1/pixels/:id - Update pixel status or details
pixelsRouter.patch('/:id', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    pixel_id?: string
    is_active?: boolean
  }>().catch(() => ({} as any))

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({ id, ...body, updated_at: new Date().toISOString() })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)

    const existing = await sql`
      SELECT id FROM retargeting_pixels WHERE id = ${id} AND user_id = ${tenant.user_id}
    `
    if (existing.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Pixel not found.' } }, 404)
    }

    const rows = await sql`
      UPDATE retargeting_pixels
      SET 
        name = COALESCE(${body.name?.trim() || null}, name),
        pixel_id = COALESCE(${body.pixel_id?.trim() || null}, pixel_id),
        is_active = COALESCE(${body.is_active !== undefined ? body.is_active : null}, is_active)
      WHERE id = ${id} AND user_id = ${tenant.user_id}
      RETURNING id, user_id, workspace_id, link_id, name, platform, pixel_id, is_active, created_at
    `

    return c.json(rows[0])
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// DELETE /api/v1/pixels/:id - Delete a pixel
pixelsRouter.delete('/:id', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    return c.json({ success: true, id })
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)

    await sql`
      DELETE FROM retargeting_pixels
      WHERE id = ${id} AND user_id = ${tenant.user_id}
    `

    return c.json({ success: true, id })
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})

// GET /api/v1/pixels/:id/events - Fetch recent event telemetry stream
pixelsRouter.get('/:id/events', tenantMiddleware, async (c) => {
  const tenant = c.get('tenant')
  const id = c.req.param('id')
  const dbUrl = c.env?.NEON_DATABASE_URL

  if (!dbUrl) {
    return c.json([])
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(dbUrl)

    const rows = await sql`
      SELECT 
        e.id, e.pixel_id, e.event_name, e.event_data, e.page_url, e.referrer,
        e.device_type, e.browser, e.os, e.country, e.city, e.timestamp
      FROM pixel_events e
      INNER JOIN retargeting_pixels p ON p.id = e.pixel_id
      WHERE e.pixel_id = ${id} AND p.user_id = ${tenant.user_id}
      ORDER BY e.timestamp DESC
      LIMIT 50
    `

    return c.json(rows)
  } catch (err: any) {
    return c.json({ error: { code: 'DB_ERROR', message: err.message || String(err) } }, 500)
  }
})
