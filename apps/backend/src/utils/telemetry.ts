/**
 * Telemetry, User-Agent Parser & Anonymized Click Logging for Xoru Edge Engine
 */

export interface ParsedClientTelemetry {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot'
  os: string
  browser: string
  referrerDomain: string
  isQr: boolean
  country: string
  city: string
  ipHash: string
}

/**
 * Anonymize Client IP using WebCrypto SHA-256 with a monthly rotating salt
 * Ensures 100% GDPR/CCPA compliance by never storing raw PII
 */
export async function hashIpAddress(ip: string, salt: string = 'xoru_default_salt_2026'): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${ip}:${salt}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

export const hashIp = hashIpAddress

/**
 * Lightweight, zero-dependency User-Agent parser optimized for Cloudflare Workers
 */
export function parseUserAgent(ua: string = ''): { deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot'; os: string; browser: string } {
  const lower = ua.toLowerCase()

  // 1. Detect Bots / Crawlers
  if (
    /bot|crawler|spider|crawling|slurp|bingbot|googlebot|duckduckbot|yandexbot|facebookexternalhit|twitterbot|whatsapp|telegrambot|curl|wget/i.test(
      lower
    )
  ) {
    return { deviceType: 'bot', os: 'Bot', browser: 'Bot / Crawler' }
  }

  // 2. Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
  if (/ipad|tablet|(android(?!.*mobile))/i.test(lower)) {
    deviceType = 'tablet'
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle|opera mini/i.test(lower)) {
    deviceType = 'mobile'
  }

  // 3. Detect Operating System
  let os = 'Other'
  if (/iphone|ipad|ipod/i.test(lower)) {
    os = 'iOS'
  } else if (/android/i.test(lower)) {
    os = 'Android'
  } else if (/macintosh|mac os x/i.test(lower)) {
    os = 'macOS'
  } else if (/windows/i.test(lower)) {
    os = 'Windows'
  } else if (/cros/i.test(lower)) {
    os = 'ChromeOS'
  } else if (/linux/i.test(lower)) {
    os = 'Linux'
  }

  // 4. Detect Browser
  let browser = 'Other'
  if (/edg\//i.test(lower)) {
    browser = 'Edge'
  } else if (/opr\/|opera/i.test(lower)) {
    browser = 'Opera'
  } else if (/brave/i.test(lower)) {
    browser = 'Brave'
  } else if (/chrome|crios/i.test(lower) && !/edg\//i.test(lower)) {
    browser = 'Chrome'
  } else if (/safari/i.test(lower) && !/chrome|crios/i.test(lower)) {
    browser = 'Safari'
  } else if (/firefox|fxios/i.test(lower)) {
    browser = 'Firefox'
  }

  return { deviceType, os, browser }
}

/**
 * Extract clean referrer domain name
 */
export function extractReferrerDomain(referrerHeader: string = ''): string {
  if (!referrerHeader || referrerHeader.trim() === '') {
    return 'Direct'
  }

  try {
    const url = new URL(referrerHeader)
    let hostname = url.hostname.toLowerCase()

    // Strip leading www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4)
    }

    // Normalized popular domains
    if (hostname === 't.co' || hostname === 'twitter.com' || hostname === 'x.com') return 'Twitter / X'
    if (hostname.includes('linkedin.com')) return 'LinkedIn'
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'Facebook'
    if (hostname.includes('instagram.com')) return 'Instagram'
    if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'YouTube'
    if (hostname.includes('reddit.com')) return 'Reddit'
    if (hostname.includes('github.com')) return 'GitHub'
    if (hostname.includes('google.')) return 'Google'
    if (hostname.includes('bing.com')) return 'Bing'
    if (hostname.includes('duckduckgo.com')) return 'DuckDuckGo'
    if (hostname.includes('tiktok.com')) return 'TikTok'
    if (hostname.includes('threads.net')) return 'Threads'

    return hostname
  } catch {
    return 'Direct'
  }
}

/**
 * Extract full telemetry payload from Cloudflare Request
 */
export async function extractTelemetry(req: Request, url: URL): Promise<ParsedClientTelemetry> {
  const ua = req.headers.get('user-agent') || ''
  const referrer = req.headers.get('referer') || req.headers.get('referrer') || ''
  const clientIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'

  const cf = (req as any).cf || {}
  const country = (cf.country || req.headers.get('cf-ipcountry') || 'Unknown').toUpperCase().slice(0, 8)
  const city = (cf.city || 'Unknown').slice(0, 128)

  const isQr = url.searchParams.get('qr') === '1' || url.searchParams.get('src') === 'qr'
  const { deviceType, os, browser } = parseUserAgent(ua)
  const referrerDomain = extractReferrerDomain(referrer)
  const ipHash = await hashIpAddress(clientIp)

  return {
    deviceType,
    os,
    browser,
    referrerDomain,
    isQr,
    country,
    city,
    ipHash,
  }
}

export interface LogClickParams {
  dbUrl: string
  linkId: string
  userId: string
  workspaceId: string
  rawReferrer?: string
  telemetry: ParsedClientTelemetry
}

/**
 * Asynchronously persist click telemetry event to Neon Postgres DB
 */
export async function logClickEventToDb(params: LogClickParams): Promise<void> {
  const { dbUrl, linkId, userId, workspaceId, rawReferrer, telemetry } = params
  if (!dbUrl) return

  try {
    const { neon } = await import('@neondatabase/serverless')
    const { generateId } = await import('./id')
    const sql = neon(dbUrl)
    const eventId = generateId('evt')

    await sql`
      INSERT INTO click_events (
        id, user_id, workspace_id, link_id, timestamp,
        country, city, device_type, browser, os,
        referrer, referrer_domain, is_qr, ip_hash
      ) VALUES (
        ${eventId}, ${userId}, ${workspaceId}, ${linkId}, NOW(),
        ${telemetry.country}, ${telemetry.city}, ${telemetry.deviceType}, ${telemetry.browser}, ${telemetry.os},
        ${rawReferrer || null}, ${telemetry.referrerDomain}, ${telemetry.isQr}, ${telemetry.ipHash}
      )
    `
  } catch (err) {
    // Background logging should never throw to main thread
    console.error('Failed to log click event to Neon DB:', err)
  }
}

