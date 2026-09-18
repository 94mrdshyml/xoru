import { describe, it, expect } from 'vitest'
import { parseUserAgent, extractReferrerDomain, hashIpAddress } from '../src/utils/telemetry'

describe('Telemetry & User-Agent Parser', () => {
  it('identifies iPhone as mobile iOS and Safari', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('mobile')
    expect(result.os).toBe('iOS')
    expect(result.browser).toBe('Safari')
  })

  it('identifies Android Chrome as mobile Android and Chrome', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('mobile')
    expect(result.os).toBe('Android')
    expect(result.browser).toBe('Chrome')
  })

  it('identifies iPad as tablet iOS and Safari', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('tablet')
    expect(result.os).toBe('iOS')
    expect(result.browser).toBe('Safari')
  })

  it('identifies macOS Firefox as desktop macOS and Firefox', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('desktop')
    expect(result.os).toBe('macOS')
    expect(result.browser).toBe('Firefox')
  })

  it('identifies Windows Edge as desktop Windows and Edge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('desktop')
    expect(result.os).toBe('Windows')
    expect(result.browser).toBe('Edge')
  })

  it('identifies crawlers / bots correctly', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('bot')
    expect(result.os).toBe('Bot')
    expect(result.browser).toBe('Bot / Crawler')
  })
})

describe('Referrer Extraction', () => {
  it('normalizes Twitter / X referrers', () => {
    expect(extractReferrerDomain('https://t.co/xyz123')).toBe('Twitter / X')
    expect(extractReferrerDomain('https://x.com/post/123')).toBe('Twitter / X')
  })

  it('normalizes LinkedIn and Google', () => {
    expect(extractReferrerDomain('https://www.linkedin.com/feed/')).toBe('LinkedIn')
    expect(extractReferrerDomain('https://www.google.com/search?q=xoru')).toBe('Google')
  })

  it('returns Direct for empty or invalid referrers', () => {
    expect(extractReferrerDomain('')).toBe('Direct')
    expect(extractReferrerDomain('invalid-url')).toBe('Direct')
  })
})

describe('IP Anonymization', () => {
  it('hashes IP into deterministic SHA-256 string without storing PII', async () => {
    const hash1 = await hashIpAddress('192.168.1.1', 'salt1')
    const hash2 = await hashIpAddress('192.168.1.1', 'salt1')
    const hash3 = await hashIpAddress('192.168.1.2', 'salt1')

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash1).toHaveLength(32)
  })
})

