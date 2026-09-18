'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  Key,
  Plus,
  Trash2,
  Check,
  Copy,
  Shield,
  Layers,
  Zap,
  Globe,
  Database,
  Lock,
  Clock,
  Sliders,
  Sparkles,
  BarChart2,
  Code as CodeIcon,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from '@deemlol/next-icons';
import { CustomModal } from '@/components/ui/CustomModal';
import { MorphButton } from '@/components/ui/MorphButton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { useWorkspace } from '@/context/WorkspaceContext';

export interface ApiKeyItem {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  environment: 'live' | 'test';
  monthly_limit: number;
  requests_count: number;
  billing_cycle_start: string;
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface ApiCallLogItem {
  id: string;
  key_id?: string | null;
  user_id: string;
  workspace_id: string;
  http_method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  request_headers?: Record<string, string> | null;
  request_body?: any;
  response_body?: any;
  error_message?: string | null;
  ip_hash: string;
  user_agent?: string | null;
  created_at: string;
  key_name?: string | null;
  key_prefix?: string | null;
}

export interface UsageSummary {
  total_requests: number;
  monthly_limit: number;
  usage_percent: number;
  active_keys_count: number;
  billing_cycle_reset_days: number;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { activeWorkspace, activeWorkspaceId, getWorkspaceLogo } = useWorkspace();

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [logs, setLogs] = useState<ApiCallLogItem[]>([]);
  const [usage, setUsage] = useState<UsageSummary>({
    total_requests: 0,
    monthly_limit: 10000,
    usage_percent: 0,
    active_keys_count: 0,
    billing_cycle_reset_days: 30,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Generate Key Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [monthlyQuota, setMonthlyQuota] = useState(10000);
  const [rateLimitInput, setRateLimitInput] = useState(60);
  const [expiresDays, setExpiresDays] = useState<number | null>(null);
  const [generatedKeySecret, setGeneratedKeySecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Expanded Log Items in Inspector
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Quickstart Snippet Tab
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'ts' | 'python'>('curl');
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState(false);

  // Revoke Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    keyId: string;
    keyName: string;
  }>({
    isOpen: false,
    keyId: '',
    keyName: '',
  });

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://xoru-backend.mridu.workers.dev';

  // Fetch API Keys, Logs, & Usage
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const wrkQuery = activeWorkspaceId ? `?workspace_id=${activeWorkspaceId}` : '';

      const [keysRes, logsRes, usageRes] = await Promise.all([
        fetch(`${backendUrl}/api/v1/api-keys${wrkQuery}`, { headers }),
        fetch(`${backendUrl}/api/v1/api-keys/logs${wrkQuery}`, { headers }),
        fetch(`${backendUrl}/api/v1/api-keys/usage${wrkQuery}`, { headers }),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(Array.isArray(data) ? data : []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, getToken, activeWorkspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate API Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setCreateError('API Key name is required.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/api-keys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment,
          workspace_id: activeWorkspaceId || undefined,
          monthly_limit: monthlyQuota,
          rate_limit_per_minute: rateLimitInput,
          expires_in_days: expiresDays,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setGeneratedKeySecret(created.key_secret);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err?.error?.message || 'Failed to generate API key.');
      }
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke Key
  const handleRevokeKey = async () => {
    if (!deleteModalState.keyId) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/api-keys/${deleteModalState.keyId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== deleteModalState.keyId));
        setDeleteModalState({ isOpen: false, keyId: '', keyName: '' });
        fetchData();
      }
    } catch {
      // Error
    }
  };

  // Copy secret key
  const handleCopySecretKey = async () => {
    if (generatedKeySecret) {
      await navigator.clipboard.writeText(generatedKeySecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGeneratedKeySecret(null);
    setCopiedKey(false);
    setNewKeyName('');
    setCreateError(null);
  };

  // Quickstart code snippets
  const sampleKey = apiKeys.find((k) => k.environment === 'live')?.key_prefix.replace(/•+/g, 'secret') || 'key_live_YOUR_SECRET_KEY';

  const curlSnippet = `curl -X POST "${backendUrl}/api/v1/links" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destination_url": "https://yourbrand.com/launch",
    "title": "Launch Campaign Link",
    "custom_slug": "launch-2026"
  }'`;

  const tsSnippet = `import { fetch } from 'undici'; // Or native fetch

const response = await fetch('${backendUrl}/api/v1/links', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${sampleKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destination_url: 'https://yourbrand.com/launch',
    title: 'Launch Campaign Link',
  }),
});

const shortLink = await response.json();
console.log('Short URL:', shortLink.short_url);`;

  const pythonSnippet = `import requests

url = "${backendUrl}/api/v1/links"
headers = {
    "Authorization": "Bearer ${sampleKey}",
    "Content-Type": "application/json"
}
payload = {
    "destination_url": "https://yourbrand.com/launch",
    "title": "Launch Campaign Link"
}

response = requests.post(url, headers=headers, json=payload)
print("Short link created:", response.json())`;

  const workspaceName = activeWorkspace?.name || 'Workspace';
  const workspaceLogo = getWorkspaceLogo(activeWorkspace);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Developer Platform & API Access</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
              REST v1
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            Manage developer API keys, usage-based billing quotas, and live audit telemetry for{' '}
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              <img src={workspaceLogo} alt={workspaceName} className="w-3 h-3 rounded object-contain" />
              {workspaceName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchData}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
            title="Refresh developer data"
          >
            <Zap className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Generate API Key</span>
          </button>
        </div>
      </div>

      {/* 1. USAGE-BASED BILLING & QUOTA METER CARD */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly API Quota & Usage Meter
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                Active Cycle
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              API calls are metered monthly across all provisioned keys in this workspace.
            </p>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {usage.total_requests.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {' '}/ {usage.monthly_limit.toLocaleString()} calls
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage.usage_percent > 90
                  ? 'bg-rose-500'
                  : usage.usage_percent > 70
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.max(2, usage.usage_percent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium">
            <span>{usage.usage_percent}% of monthly plan consumed</span>
            <span>Resets in {usage.billing_cycle_reset_days} days</span>
          </div>
        </div>
      </div>

      {/* 2. DEVELOPER API KEYS TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Provisioned API Keys</h2>
            <p className="text-xs text-slate-500">
              Use Bearer token authentication to automate short links and extract telemetry.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {apiKeys.length} {apiKeys.length === 1 ? 'key' : 'keys'} active
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {apiKeys.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Key className="w-5 h-5 stroke-[2]" />
              </div>
              <p className="text-xs font-bold text-slate-800">No API Keys Generated</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Generate a Stripe-style API key to connect your backend services, Zapier integrations, or mobile apps.
              </p>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Generate First Key</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Key Name</th>
                  <th className="px-5 py-3.5">Key Prefix</th>
                  <th className="px-5 py-3.5">Environment</th>
                  <th className="px-5 py-3.5">Rate Limit</th>
                  <th className="px-5 py-3.5">Usage / Quota</th>
                  <th className="px-5 py-3.5">Last Used</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{k.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200/60">
                        {k.key_prefix}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
                          k.environment === 'live'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        {k.environment}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {k.rate_limit_per_minute} req/min
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-700 tabular-nums">
                      {k.requests_count.toLocaleString()} / {k.monthly_limit.toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModalState({
                            isOpen: true,
                            keyId: k.id,
                            keyName: k.name,
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3. LIVE REQUEST & RESPONSE AUDIT LOG INSPECTOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>Live API Request & Response Inspector</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-500">
              Audit trail of requests, response status codes, execution latency, and JSON payloads.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {logs.length} Recent Calls
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {logs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <CodeIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <p className="text-xs font-bold text-slate-800">No API Calls Recorded Yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Make a request to the Xoru REST API using an API key or curl snippet to inspect payloads here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isSuccess = log.status_code >= 200 && log.status_code < 300;
                const isRateLimit = log.status_code === 429;

                return (
                  <div key={log.id} className="transition-colors hover:bg-slate-50/50">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="flex items-center justify-between p-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isRateLimit
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {log.http_method} {log.status_code}
                        </span>

                        <span className="font-mono text-xs font-bold text-slate-900">
                          {log.endpoint}
                        </span>

                        {log.key_name && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            <Key className="w-2.5 h-2.5" />
                            {log.key_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
                        <span className="text-indigo-600 font-semibold">{log.response_time_ms}ms</span>
                        <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-indigo-600' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable JSON Inspector */}
                    {isExpanded && (
                      <div className="p-4 pt-0 space-y-3 bg-slate-50/80 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                          {/* Request Payload */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Request Body Payload
                            </span>
                            <pre className="overflow-x-auto text-[11px] font-mono text-slate-800 max-h-48 p-2 rounded bg-slate-50">
                              {log.request_body
                                ? JSON.stringify(log.request_body, null, 2)
                                : 'No payload body'}
                            </pre>
                          </div>

                          {/* Response Payload */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Response Body Payload
                            </span>
                            <pre className="overflow-x-auto text-[11px] font-mono text-slate-800 max-h-48 p-2 rounded bg-slate-50">
                              {log.response_body
                                ? JSON.stringify(log.response_body, null, 2)
                                : log.error_message || 'HTTP Status ' + log.status_code}
                            </pre>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pt-1">
                          <span>IP Hash: {log.ip_hash}</span>
                          <span>User-Agent: {log.user_agent || 'Client SDK'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. INTERACTIVE QUICKSTART CODE EXAMPLES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Developer Quickstart</h2>
            <p className="text-xs text-slate-500">
              Integrate short link creation directly into your applications.
            </p>
          </div>

          <div className="flex gap-1 border border-slate-200 bg-white p-0.5 rounded-xl shadow-2xs">
            {(['curl', 'ts', 'python'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveCodeTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                  activeCodeTab === tab
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'curl' ? 'cURL' : tab === 'ts' ? 'TypeScript' : 'Python'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-indigo-100 shadow-inner">
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={async () => {
                const text = activeCodeTab === 'curl' ? curlSnippet : activeCodeTab === 'ts' ? tsSnippet : pythonSnippet;
                await navigator.clipboard.writeText(text);
                setCopiedCodeSnippet(true);
                setTimeout(() => setCopiedCodeSnippet(false), 2000);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 px-3 py-1.5 text-[11px] font-bold text-white border border-indigo-400/20 transition-all shadow-xs"
            >
              {copiedCodeSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCodeSnippet ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="overflow-x-auto whitespace-pre-wrap pr-24 leading-relaxed">
            {activeCodeTab === 'curl' && curlSnippet}
            {activeCodeTab === 'ts' && tsSnippet}
            {activeCodeTab === 'python' && pythonSnippet}
          </pre>
        </div>
      </div>

      {/* GENERATE KEY MODAL */}
      <CustomModal
        isOpen={isGenerateModalOpen}
        onClose={closeGenerateModal}
        title="Generate Developer API Key"
        description="Provision a Stripe-style API key with custom rate limits and usage quotas."
      >
        <div className="space-y-4 pt-1">
          {generatedKeySecret ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5 text-xs">
                <div className="font-bold text-emerald-950 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>API Key Generated Successfully</span>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Please copy this key and store it securely. For security reasons,{' '}
                  <strong className="font-bold underline">you will not be able to see it again</strong>!
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-2.5">
                <span className="font-mono text-xs font-bold text-slate-900 truncate flex-1 select-all">
                  {generatedKeySecret}
                </span>
                <button
                  type="button"
                  onClick={handleCopySecretKey}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Secret'}</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerateKey} className="space-y-4">
              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {createError}
                </div>
              )}

              {/* Key Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Key Label / Service Name
                </label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Backend Service"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Environment Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Environment Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'live', label: 'Live (Production)', desc: 'Processes live short links' },
                    { id: 'test', label: 'Test (Sandbox)', desc: 'For integration & staging' },
                  ].map((env) => {
                    const isSelected = environment === env.id;
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => setEnvironment(env.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{env.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{env.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Quota & Rate Limit Preset Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Monthly Quota
                  </label>
                  <select
                    value={monthlyQuota}
                    onChange={(e) => setMonthlyQuota(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={5000}>5,000 requests/mo</option>
                    <option value={10000}>10,000 requests/mo (Standard)</option>
                    <option value={50000}>50,000 requests/mo</option>
                    <option value={250000}>250,000 requests/mo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Rate Limit
                  </label>
                  <select
                    value={rateLimitInput}
                    onChange={(e) => setRateLimitInput(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={60}>60 req/min (Standard)</option>
                    <option value={120}>120 req/min</option>
                    <option value={300}>300 req/min (High Throughput)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Generate API Key'}
                </button>
              </div>
            </form>
          )}
        </div>
      </CustomModal>

      {/* REVOKE KEY MODAL */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleRevokeKey}
        title="Revoke Developer API Key"
        itemName={deleteModalState.keyName}
        description="Are you sure you want to revoke this API key? Any automated services or servers using this token will immediately receive 401 Unauthorized errors."
      />
    </div>
  );
}
