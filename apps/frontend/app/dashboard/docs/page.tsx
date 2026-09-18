'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Code,
  Sparkles,
  Link2,
  BarChart2,
  GitBranch,
  Target,
  Key,
  Shield,
  Zap,
  Layers,
  ChevronRight,
  ExternalLink,
  Play,
  Terminal,
} from '@deemlol/next-icons';
import { MorphButton } from '@/components/ui/MorphButton';

interface EndpointDoc {
  id: string;
  category: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  authRequired: boolean;
  rateLimit: string;
  requestBody?: Record<string, any>;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  responseExample: Record<string, any> | any[];
  curlExample: string;
  tsExample: string;
  pythonExample: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://xoru-backend.mridu.workers.dev';

export default function ApiDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCodeTab, setActiveCodeTab] = useState<Record<string, 'curl' | 'ts' | 'python'>>({});

  // Interactive Live Console State
  const [consoleKey, setConsoleKey] = useState<string>('key_test_LSNB7Lu4Nw8OqYwKF8kMmKcQvvrGTzW4');
  const [consoleEndpoint, setConsoleEndpoint] = useState<string>('/api/v1/links');
  const [consoleMethod, setConsoleMethod] = useState<'GET' | 'POST'>('GET');
  const [consoleBody, setConsoleBody] = useState<string>('{\n  "title": "My Link",\n  "destination_url": "https://example.com"\n}');
  const [consoleLoading, setConsoleLoading] = useState<boolean>(false);
  const [consoleResponse, setConsoleResponse] = useState<{ status: number; headers: Record<string, string>; data: any; latency: number } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getCodeTab = (endpointId: string): 'curl' | 'ts' | 'python' => {
    return activeCodeTab[endpointId] || 'curl';
  };

  const setCodeTab = (endpointId: string, tab: 'curl' | 'ts' | 'python') => {
    setActiveCodeTab((prev) => ({ ...prev, [endpointId]: tab }));
  };

  const handleExecuteLiveTest = async () => {
    setConsoleLoading(true);
    setConsoleResponse(null);
    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (consoleKey.trim()) {
        headers['Authorization'] = `Bearer ${consoleKey.trim()}`;
      }

      const options: RequestInit = {
        method: consoleMethod,
        headers,
      };

      if (consoleMethod === 'POST' && consoleBody.trim()) {
        options.body = consoleBody;
      }

      const res = await fetch(`${BASE_URL}${consoleEndpoint}`, options);
      const latency = Math.round(performance.now() - startTime);

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        if (key.startsWith('x-ratelimit') || key === 'content-type' || key === 'retry-after') {
          respHeaders[key] = val;
        }
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }

      setConsoleResponse({
        status: res.status,
        headers: respHeaders,
        data,
        latency,
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setConsoleResponse({
        status: 0,
        headers: {},
        data: { error: err.message || 'Network request failed' },
        latency,
      });
    } finally {
      setConsoleLoading(false);
    }
  };

  const endpoints: EndpointDoc[] = [
    {
      id: 'get-links',
      category: 'Short Links',
      method: 'GET',
      path: '/api/v1/links',
      title: 'List Short Links',
      description: 'Retrieve all short links associated with the authenticated workspace and tenant.',
      authRequired: true,
      rateLimit: '60 req/min',
      queryParams: [
        { name: 'workspace_id', type: 'string', required: false, description: 'Optional workspace ID to filter links.' },
      ],
      responseExample: [
        {
          id: 'lnk_PGQ0d0PZ6kGxNGpfoqlr4HQM',
          user_id: 'usr_3JSio6WOA8bg37Ob5ytOzRWlXLj',
          workspace_id: 'wrk_6Mwd37e1YTIltWdK68LC1VLK',
          title: 'Launch Blog Post',
          description: 'Q3 Product Announcement',
          destination_url: 'https://example.com/posts/launch',
          short_code: 'kEVkR4L',
          custom_slug: 'launch-2026',
          redirect_type: 302,
          is_active: true,
          is_protected: false,
          is_one_time: false,
          expires_at: null,
          click_count: 42,
          created_at: '2026-09-18T05:52:07.989Z',
        },
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/v1/links" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/links', {
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const links = await response.json();
console.log(links);`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.get("${BASE_URL}/api/v1/links", headers=headers)
print(response.json())`,
    },
    {
      id: 'post-links',
      category: 'Short Links',
      method: 'POST',
      path: '/api/v1/links',
      title: 'Create Short Link',
      description: 'Provisions a new short link with optional custom slug, password protection, expiration, and one-time burn rules.',
      authRequired: true,
      rateLimit: '60 req/min',
      requestBody: {
        destination_url: 'https://example.com/pricing',
        title: 'Pricing Page',
        custom_slug: 'pricing-deals',
        description: 'Internal campaign link',
        redirect_type: 302,
        password: 'secure-password-123',
        is_one_time: false,
        expires_at: '2026-12-31T23:59:59Z',
      },
      responseExample: {
        id: 'lnk_wlzxXDZnjpBwHg986wyIsPMt',
        workspace_id: 'wrk_6Mwd37e1YTIltWdK68LC1VLK',
        title: 'Pricing Page',
        destination_url: 'https://example.com/pricing',
        short_code: 'BqInlxk',
        custom_slug: 'pricing-deals',
        redirect_type: 302,
        is_protected: true,
        is_one_time: false,
        is_consumed: false,
        click_count: 0,
        created_at: '2026-09-18T08:30:00.000Z',
      },
      curlExample: `curl -X POST "${BASE_URL}/api/v1/links" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination_url": "https://example.com/pricing",
    "title": "Pricing Page",
    "custom_slug": "pricing-deals"
  }'`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/links', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    destination_url: 'https://example.com/pricing',
    title: 'Pricing Page',
    custom_slug: 'pricing-deals'
  })
});
const link = await response.json();`,
      pythonExample: `import os
import requests

payload = {
    "destination_url": "https://example.com/pricing",
    "title": "Pricing Page",
    "custom_slug": "pricing-deals"
}
headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}",
    "Content-Type": "application/json"
}
response = requests.post("${BASE_URL}/api/v1/links", json=payload, headers=headers)
print(response.json())`,
    },
    {
      id: 'delete-links',
      category: 'Short Links',
      method: 'DELETE',
      path: '/api/v1/links/:id',
      title: 'Delete Short Link',
      description: 'Permanently deletes a short link and immediately invalidates its Cloudflare KV edge cache entry.',
      authRequired: true,
      rateLimit: '60 req/min',
      responseExample: {
        success: true,
      },
      curlExample: `curl -X DELETE "${BASE_URL}/api/v1/links/lnk_wlzxXDZnjpBwHg986wyIsPMt" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/links/lnk_wlzxXDZnjpBwHg986wyIsPMt', {
  method: 'DELETE',
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const result = await response.json();`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.delete("${BASE_URL}/api/v1/links/lnk_wlzxXDZnjpBwHg986wyIsPMt", headers=headers)
print(response.json())`,
    },
    {
      id: 'get-analytics',
      category: 'Analytics',
      method: 'GET',
      path: '/api/v1/analytics',
      title: 'Get Real-Time Analytics',
      description: 'Aggregates click counts, unique visitors, QR code scans, 7-day time series, top devices, operating systems, countries, and referrers.',
      authRequired: true,
      rateLimit: '60 req/min',
      queryParams: [
        { name: 'period', type: 'string', required: false, description: 'Timeframe filter: 7d (default), 30d, or all.' },
        { name: 'workspace_id', type: 'string', required: false, description: 'Scope telemetry to a specific workspace.' },
        { name: 'link_id', type: 'string', required: false, description: 'Scope telemetry to a single short link.' },
      ],
      responseExample: {
        total_clicks: 1250,
        unique_visitors: 940,
        qr_clicks: 180,
        clicks_by_date: [
          { date: '2026-09-17', label: 'Thu', count: 184 },
          { date: '2026-09-18', label: 'Fri', count: 210 },
        ],
        top_devices: [
          { device: 'mobile', count: 750, percent: 60 },
          { device: 'desktop', count: 500, percent: 40 },
        ],
        top_countries: [
          { code: 'US', name: 'United States', count: 620, percent: 50 },
          { code: 'IN', name: 'India', count: 310, percent: 25 },
        ],
        top_referrers: [
          { referrer: 'Twitter / X', count: 450, percent: 36 },
          { referrer: 'Direct', count: 320, percent: 26 },
        ],
      },
      curlExample: `curl -X GET "${BASE_URL}/api/v1/analytics?period=7d" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/analytics?period=7d', {
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const analytics = await response.json();`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.get("${BASE_URL}/api/v1/analytics?period=7d", headers=headers)
print(response.json())`,
    },
    {
      id: 'get-workspaces',
      category: 'Workspaces',
      method: 'GET',
      path: '/api/v1/workspaces',
      title: 'List Workspaces',
      description: 'Returns all workspaces provisioned under the authenticated tenant.',
      authRequired: true,
      rateLimit: '60 req/min',
      responseExample: [
        {
          id: 'wrk_6Mwd37e1YTIltWdK68LC1VLK',
          user_id: 'usr_3JSio6WOA8bg37Ob5ytOzRWlXLj',
          name: 'Marketing Campaigns',
          slug: 'wrk-marketing-campaigns-6Mwd37',
          logo_url: null,
          created_at: '2026-09-17T17:14:45.792Z',
        },
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/v1/workspaces" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/workspaces', {
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const workspaces = await response.json();`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.get("${BASE_URL}/api/v1/workspaces", headers=headers)
print(response.json())`,
    },
    {
      id: 'get-usage',
      category: 'Usage & Billing',
      method: 'GET',
      path: '/api/v1/api-keys/usage',
      title: 'Get Usage Billing Metrics',
      description: 'Inspects active request consumption, monthly quota limits, usage percentage, and countdown until the next billing reset.',
      authRequired: true,
      rateLimit: '60 req/min',
      responseExample: {
        total_requests: 485,
        monthly_limit: 10000,
        usage_percent: 5,
        active_keys_count: 2,
        billing_cycle_reset_days: 12,
      },
      curlExample: `curl -X GET "${BASE_URL}/api/v1/api-keys/usage" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/api-keys/usage', {
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const usage = await response.json();`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.get("${BASE_URL}/api/v1/api-keys/usage", headers=headers)
print(response.json())`,
    },
    {
      id: 'get-logs',
      category: 'Audit Logs',
      method: 'GET',
      path: '/api/v1/api-keys/logs',
      title: 'Get Request/Response Audit Logs',
      description: 'Returns high-resolution execution logs for API calls made with API keys, including latency in ms, HTTP status, and payloads.',
      authRequired: true,
      rateLimit: '60 req/min',
      responseExample: [
        {
          id: 'apilog_pOlGKEbzWJSckNBocCdUarWI',
          key_id: 'key_Y9s26F9CT7Q6pSxDv4Oky1Zj',
          key_name: 'Production Key',
          key_prefix: 'key_live_••••89fa',
          http_method: 'GET',
          endpoint: '/api/v1/links',
          status_code: 200,
          response_time_ms: 18,
          ip_hash: 'dfdae99b0ee6e98a298bf6d807503135',
          created_at: '2026-09-18T08:39:39.403Z',
        },
      ],
      curlExample: `curl -X GET "${BASE_URL}/api/v1/api-keys/logs" \\
  -H "Authorization: Bearer \${YOUR_API_KEY}"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/api-keys/logs', {
  headers: {
    'Authorization': \`Bearer \${process.env.XORU_API_KEY}\`
  }
});
const logs = await response.json();`,
      pythonExample: `import os
import requests

headers = {
    "Authorization": f"Bearer {os.environ.get('XORU_API_KEY')}"
}
response = requests.get("${BASE_URL}/api/v1/api-keys/logs", headers=headers)
print(response.json())`,
    },
    {
      id: 'get-health',
      category: 'System',
      method: 'GET',
      path: '/api/v1/health',
      title: 'API Health Check',
      description: 'Returns edge runtime status, timestamp, and active environment mode.',
      authRequired: false,
      rateLimit: 'Unlimited',
      responseExample: {
        status: 'healthy',
        service: 'xoru-backend',
        timestamp: '2026-09-18T08:45:00.000Z',
        environment: 'production',
      },
      curlExample: `curl -X GET "${BASE_URL}/api/v1/health"`,
      tsExample: `const response = await fetch('${BASE_URL}/api/v1/health');
const health = await response.json();`,
      pythonExample: `import requests
response = requests.get("${BASE_URL}/api/v1/health")
print(response.json())`,
    },
  ];

  const categories = ['all', 'Short Links', 'Analytics', 'Workspaces', 'Usage & Billing', 'Audit Logs', 'System'];

  const filteredEndpoints = selectedCategory === 'all'
    ? endpoints
    : endpoints.filter((e) => e.category === selectedCategory);

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'POST':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PATCH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Hero Surface */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <BookOpen className="w-3.5 h-3.5" />
            <span>REST API Reference & Developer Guide</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Xoru Developer API Reference
          </h1>

          <p className="text-sm leading-relaxed text-slate-600">
            Automate short link generation, dynamic routing, first-party pixel tracking, and telemetry analytics programmatically with sub-10ms global edge redirects and multi-tenant Row-Level Security.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
              <span className="font-bold text-slate-400">BASE URL:</span>
              <span className="font-semibold text-indigo-600">{BASE_URL}</span>
              <button
                onClick={() => copyToClipboard(BASE_URL, 'base-url')}
                className="text-slate-400 hover:text-slate-600 ml-1 transition-colors"
                title="Copy Base URL"
              >
                {copiedSection === 'base-url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auth: Bearer & X-API-Key</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>KV Edge Cached</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Authentication & Rate Limiting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Key className="w-4 h-4" />
            </div>
            <span>Authentication</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pass your Developer API key in the <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">Authorization</code> header as a Bearer token or via the <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">X-API-Key</code> header.
          </p>
          <div className="rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-200 relative group">
            <code>Authorization: Bearer key_live_••••••••••••••••</code>
            <button
              onClick={() => copyToClipboard('Authorization: Bearer key_live_...', 'auth-header')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              {copiedSection === 'auth-header' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
            <span>Rate Limiting & Response Headers</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Requests are rate-limited via sliding window edge counters. Exceeding limits returns <code className="font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">429 Too Many Requests</code> with standard RFC headers:
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 font-mono text-[11px] text-slate-700 space-y-1">
            <div><span className="text-slate-400">X-RateLimit-Limit:</span> 60</div>
            <div><span className="text-slate-400">X-RateLimit-Remaining:</span> 58</div>
            <div><span className="text-slate-400">Retry-After:</span> 42</div>
          </div>
        </div>
      </div>

      {/* 3. Live Interactive API Playground */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Live API Tester & Console</h2>
              <p className="text-xs text-slate-500">Test API requests directly against live Cloudflare Workers</p>
            </div>
          </div>

          {consoleResponse && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                consoleResponse.status >= 200 && consoleResponse.status < 300
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                HTTP {consoleResponse.status || 'ERR'}
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                {consoleResponse.latency}ms
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">API Key</label>
              <input
                type="text"
                value={consoleKey}
                onChange={(e) => setConsoleKey(e.target.value)}
                placeholder="key_test_... or key_live_..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
                <select
                  value={consoleMethod}
                  onChange={(e) => setConsoleMethod(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Endpoint Path</label>
                <select
                  value={consoleEndpoint}
                  onChange={(e) => {
                    setConsoleEndpoint(e.target.value);
                    if (e.target.value === '/api/v1/links' && consoleMethod === 'POST') {
                      setConsoleBody('{\n  "title": "Quick API Link",\n  "destination_url": "https://indexdaily.in"\n}');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="/api/v1/links">/api/v1/links</option>
                  <option value="/api/v1/analytics?period=7d">/api/v1/analytics?period=7d</option>
                  <option value="/api/v1/workspaces">/api/v1/workspaces</option>
                  <option value="/api/v1/pixels">/api/v1/pixels</option>
                  <option value="/api/v1/api-keys/usage">/api/v1/api-keys/usage</option>
                  <option value="/api/v1/api-keys/logs">/api/v1/api-keys/logs</option>
                  <option value="/api/v1/health">/api/v1/health</option>
                </select>
              </div>
            </div>

            {consoleMethod === 'POST' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">JSON Request Body</label>
                <textarea
                  rows={4}
                  value={consoleBody}
                  onChange={(e) => setConsoleBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-900 p-2.5 font-mono text-xs text-emerald-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleExecuteLiveTest}
              disabled={consoleLoading}
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              {consoleLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Execute Live API Request</span>
            </button>
          </div>

          {/* Response Console */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Live Response Output</span>
              {consoleResponse && (
                <span className="text-[11px] font-mono text-slate-500">
                  {consoleResponse.status === 200 ? '200 OK' : `Status: ${consoleResponse.status}`}
                </span>
              )}
            </div>

            <div className="flex-1 rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-slate-200 overflow-x-auto min-h-[160px] max-h-[260px] border border-slate-800">
              {consoleLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Executing request to Cloudflare edge...
                </div>
              ) : consoleResponse ? (
                <pre className="text-emerald-400 text-[11px] leading-relaxed">
                  {JSON.stringify(consoleResponse.data, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 text-xs flex flex-col items-center justify-center h-full space-y-1">
                  <span>Click "Execute Live API Request" to test</span>
                  <span className="text-[10px] text-slate-600">Responses stream directly from https://xoru-backend.mridu.workers.dev</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All Endpoints' : cat}
            </button>
          );
        })}
      </div>

      {/* 5. Endpoints Reference List */}
      <div className="space-y-6">
        {filteredEndpoints.map((ep) => {
          const currentTab = getCodeTab(ep.id);
          const snippet = currentTab === 'curl' ? ep.curlExample : currentTab === 'ts' ? ep.tsExample : ep.pythonExample;

          return (
            <div
              key={ep.id}
              id={ep.id}
              className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all duration-200"
            >
              {/* Endpoint Header Bar */}
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border font-mono ${getMethodBadgeClass(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {ep.path}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {ep.rateLimit}
                  </span>
                  {ep.authRequired ? (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      API Key Required
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                      Public
                    </span>
                  )}
                </div>
              </div>

              {/* Endpoint Details */}
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{ep.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ep.description}</p>
                </div>

                {/* Query Parameters Table */}
                {ep.queryParams && ep.queryParams.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Query Parameters</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <tr>
                            <th className="px-3 py-2">Parameter</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Required</th>
                            <th className="px-3 py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ep.queryParams.map((param) => (
                            <tr key={param.name}>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-600">{param.name}</td>
                              <td className="px-3 py-2 font-mono text-slate-500">{param.type}</td>
                              <td className="px-3 py-2">
                                {param.required ? (
                                  <span className="font-bold text-rose-600">Yes</span>
                                ) : (
                                  <span className="text-slate-400">No</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Code Examples and Response Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Request Code Snippet */}
                  <div className="rounded-xl border border-slate-200 bg-slate-950 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
                      <div className="flex items-center gap-1">
                        {(['curl', 'ts', 'python'] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setCodeTab(ep.id, lang)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              currentTab === lang
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {lang === 'curl' ? 'cURL' : lang === 'ts' ? 'TypeScript' : 'Python'}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => copyToClipboard(snippet, `${ep.id}-req`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedSection === `${ep.id}-req` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3.5 font-mono text-xs text-slate-200 overflow-x-auto flex-1 max-h-[220px]">
                      <pre className="leading-relaxed">{snippet}</pre>
                    </div>
                  </div>

                  {/* Response Example */}
                  <div className="rounded-xl border border-slate-200 bg-slate-950 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Response (200 OK)
                      </span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(ep.responseExample, null, 2), `${ep.id}-res`)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedSection === `${ep.id}-res` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto flex-1 max-h-[220px]">
                      <pre className="leading-relaxed">{JSON.stringify(ep.responseExample, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
