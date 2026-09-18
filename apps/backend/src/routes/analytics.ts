import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/auth'
import { withTenantDb } from '../db/client'

type Bindings = {
  XORU_KV: KVNamespace
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  ENVIRONMENT: string
}

const analyticsApp = new Hono<{ Bindings: Bindings }>()

analyticsApp.use('*', tenantMiddleware)

// ISO Country Code to Name dictionary for top countries
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  IN: 'India',
  GB: 'United Kingdom',
  DE: 'Germany',
  SG: 'Singapore',
  CA: 'Canada',
  AU: 'Australia',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  NL: 'Netherlands',
  AE: 'United Arab Emirates',
  ES: 'Spain',
  IT: 'Italy',
  SE: 'Sweden',
  CH: 'Switzerland',
  ID: 'Indonesia',
  ZA: 'South Africa',
  Unknown: 'Unknown Region',
}

// 1. Fetch Aggregated Telemetry Analytics
analyticsApp.get('/', async (c) => {
  const tenant = c.get('tenant')
  const userId = tenant.user_id
  const workspaceId = c.req.query('workspace_id')
  const linkId = c.req.query('link_id')
  const period = c.req.query('period') || '7d'

  const dbUrl = c.env?.NEON_DATABASE_URL
  if (!dbUrl) {
    return c.json({
      total_clicks: 0,
      unique_visitors: 0,
      qr_clicks: 0,
      clicks_by_date: [],
      top_devices: [],
      top_os: [],
      top_browsers: [],
      top_countries: [],
      top_referrers: [],
    })
  }

  try {
    const data = await withTenantDb(dbUrl, userId, async (sql) => {
      // Days filter interval
      const intervalDays = period === '30d' ? 30 : period === 'all' ? 365 : 7

      // 1. High level aggregates
      let summaryRows
      if (linkId) {
        summaryRows = await sql`
          SELECT 
            COUNT(id)::int as total_clicks,
            COUNT(DISTINCT ip_hash)::int as unique_visitors,
            COUNT(CASE WHEN is_qr = TRUE THEN 1 END)::int as qr_clicks
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
        `
      } else if (workspaceId) {
        summaryRows = await sql`
          SELECT 
            COUNT(id)::int as total_clicks,
            COUNT(DISTINCT ip_hash)::int as unique_visitors,
            COUNT(CASE WHEN is_qr = TRUE THEN 1 END)::int as qr_clicks
          FROM click_events
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
        `
      } else {
        summaryRows = await sql`
          SELECT 
            COUNT(id)::int as total_clicks,
            COUNT(DISTINCT ip_hash)::int as unique_visitors,
            COUNT(CASE WHEN is_qr = TRUE THEN 1 END)::int as qr_clicks
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
        `
      }

      const totalClicks = summaryRows[0]?.total_clicks || 0
      const uniqueVisitors = summaryRows[0]?.unique_visitors || 0
      const qrClicks = summaryRows[0]?.qr_clicks || 0

      // 2. Clicks by Date (last 7 or 30 days)
      let timeSeriesRows
      if (linkId) {
        timeSeriesRows = await sql`
          SELECT 
            TO_CHAR(DATE(timestamp), 'YYYY-MM-DD') as date_key,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY date_key
          ORDER BY date_key ASC
        `
      } else if (workspaceId) {
        timeSeriesRows = await sql`
          SELECT 
            TO_CHAR(DATE(timestamp), 'YYYY-MM-DD') as date_key,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY date_key
          ORDER BY date_key ASC
        `
      } else {
        timeSeriesRows = await sql`
          SELECT 
            TO_CHAR(DATE(timestamp), 'YYYY-MM-DD') as date_key,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY date_key
          ORDER BY date_key ASC
        `
      }

      // Map time series to continuous date entries
      const dateMap = new Map<string, number>()
      for (const row of timeSeriesRows) {
        dateMap.set(row.date_key, Number(row.count) || 0)
      }

      const clicksByDate: { date: string; label: string; count: number }[] = []
      const today = new Date()
      for (let i = intervalDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateKey = d.toISOString().split('T')[0]
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
        clicksByDate.push({
          date: dateKey,
          label: dayLabel,
          count: dateMap.get(dateKey) || 0,
        })
      }

      // 3. Top Devices
      let deviceRows
      if (linkId) {
        deviceRows = await sql`
          SELECT 
            COALESCE(device_type, 'desktop') as device,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY device
          ORDER BY count DESC
        `
      } else {
        deviceRows = await sql`
          SELECT 
            COALESCE(device_type, 'desktop') as device,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY device
          ORDER BY count DESC
        `
      }

      const topDevices = deviceRows.map((r) => {
        const count = Number(r.count) || 0
        const percent = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
        return {
          device: r.device,
          count,
          percent,
        }
      })

      // 4. Top Countries
      let countryRows
      if (linkId) {
        countryRows = await sql`
          SELECT 
            COALESCE(country, 'Unknown') as country,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY country
          ORDER BY count DESC
          LIMIT 10
        `
      } else {
        countryRows = await sql`
          SELECT 
            COALESCE(country, 'Unknown') as country,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY country
          ORDER BY count DESC
          LIMIT 10
        `
      }

      const topCountries = countryRows.map((r) => {
        const code = String(r.country).toUpperCase()
        const count = Number(r.count) || 0
        const percent = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
        return {
          code,
          name: COUNTRY_NAMES[code] || code,
          count,
          percent,
        }
      })

      // 5. Top Referrers
      let referrerRows
      if (linkId) {
        referrerRows = await sql`
          SELECT 
            COALESCE(referrer_domain, 'Direct') as referrer,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY referrer
          ORDER BY count DESC
          LIMIT 8
        `
      } else {
        referrerRows = await sql`
          SELECT 
            COALESCE(referrer_domain, 'Direct') as referrer,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY referrer
          ORDER BY count DESC
          LIMIT 8
        `
      }

      const topReferrers = referrerRows.map((r) => {
        const count = Number(r.count) || 0
        const percent = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0
        return {
          referrer: r.referrer,
          count,
          percent,
        }
      })

      // 6. Top Operating Systems
      let osRows
      if (linkId) {
        osRows = await sql`
          SELECT 
            COALESCE(os, 'Other') as os,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId} AND link_id = ${linkId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY os
          ORDER BY count DESC
          LIMIT 6
        `
      } else {
        osRows = await sql`
          SELECT 
            COALESCE(os, 'Other') as os,
            COUNT(id)::int as count
          FROM click_events
          WHERE user_id = ${userId}
            AND timestamp >= NOW() - (${intervalDays} || ' days')::interval
          GROUP BY os
          ORDER BY count DESC
          LIMIT 6
        `
      }

      const topOs = osRows.map((r) => ({
        os: r.os,
        count: Number(r.count) || 0,
        percent: totalClicks > 0 ? Math.round(((Number(r.count) || 0) / totalClicks) * 100) : 0,
      }))

      return {
        total_clicks: totalClicks,
        unique_visitors: uniqueVisitors,
        qr_clicks: qrClicks,
        clicks_by_date: clicksByDate,
        top_devices: topDevices,
        top_os: topOs,
        top_countries: topCountries,
        top_referrers: topReferrers,
      }
    })

    return c.json(data)
  } catch (err: any) {
    console.error('Analytics aggregation error:', err)
    return c.json(
      { error: { code: 'ANALYTICS_ERROR', message: err.message || 'Failed to aggregate analytics data.' } },
      500
    )
  }
})

export default analyticsApp

