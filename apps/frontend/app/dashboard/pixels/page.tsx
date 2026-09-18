'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Target,
  Plus,
  Trash2,
  Check,
  Copy,
  Code as CodeIcon,
  Mail,
  Zap,
  Sparkles,
  Layers,
  ArrowRight,
  Globe,
  Smartphone,
  BarChart2,
  Sliders,
} from '@deemlol/next-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { CustomModal } from '@/components/ui/CustomModal';
import { MorphButton } from '@/components/ui/MorphButton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

export interface PixelItem {
  id: string;
  user_id: string;
  workspace_id: string;
  link_id?: string | null;
  name: string;
  platform: 'xoru' | 'meta' | 'google' | 'tiktok' | 'twitter' | 'linkedin' | 'custom';
  pixel_id: string;
  is_active: boolean;
  events_count?: number;
  created_at: string;
}

export interface PixelEvent {
  id: string;
  pixel_id: string;
  event_name: string;
  event_data?: Record<string, any>;
  page_url?: string;
  referrer?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  timestamp: string;
}

export default function PixelsPage() {
  const { getToken } = useAuth();
  const { activeWorkspace, activeWorkspaceId, getWorkspaceLogo } = useWorkspace();

  const [pixels, setPixels] = useState<PixelItem[]>([]);
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'script' | 'gif' | 'api'>('script');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [platform, setPlatform] = useState<PixelItem['platform']>('xoru');
  const [pixelName, setPixelName] = useState('');
  const [pixelIdInput, setPixelIdInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Test Event State
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    pixelId: string;
    pixelName: string;
  }>({
    isOpen: false,
    pixelId: '',
    pixelName: '',
  });

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://xoru-backend.mridu.workers.dev';

  // Fetch Pixels
  const fetchPixels = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const queryUrl = activeWorkspaceId
        ? `${backendUrl}/api/v1/pixels?workspace_id=${activeWorkspaceId}`
        : `${backendUrl}/api/v1/pixels`;

      const res = await fetch(queryUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: PixelItem[] = Array.isArray(data) ? data : [];
        setPixels(list);

        // Fetch events for the first Xoru pixel if available
        const xoruPix = list.find((p) => p.platform === 'xoru');
        if (xoruPix) {
          fetchPixelEvents(xoruPix.id, token);
        } else {
          setEvents([]);
        }
      } else {
        setPixels([]);
      }
    } catch {
      setPixels([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, getToken, activeWorkspaceId]);

  // Fetch Live Pixel Events
  const fetchPixelEvents = async (pixelId: string, token: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/pixels/${pixelId}/events`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchPixels();
  }, [fetchPixels]);

  // Find or determine primary Xoru Pixel for current workspace
  const xoruPixel = pixels.find((p) => p.platform === 'xoru') || pixels[0];
  const activePixelCode = xoruPixel ? xoruPixel.pixel_id || xoruPixel.id : 'pxl_live_xoru';

  // Copy helper
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(type);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Create Pixel
  const handleCreatePixel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (platform !== 'xoru' && !pixelIdInput.trim()) {
      setCreateError('Pixel / Measurement ID is required for 3rd-party ad tags.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/pixels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform,
          name: pixelName.trim() || undefined,
          pixel_id: pixelIdInput.trim() || undefined,
          workspace_id: activeWorkspaceId || undefined,
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setPixelName('');
        setPixelIdInput('');
        setPlatform('xoru');
        fetchPixels();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err?.error?.message || 'Failed to provision pixel.');
      }
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pixel Active
  const handleTogglePixel = async (id: string, currentStatus: boolean) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${backendUrl}/api/v1/pixels/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      setPixels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !currentStatus } : p))
      );
    } catch {
      // Revert on error
    }
  };

  // Delete Pixel
  const handleDeletePixel = async () => {
    if (!deleteModalState.pixelId) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/pixels/${deleteModalState.pixelId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setPixels((prev) => prev.filter((p) => p.id !== deleteModalState.pixelId));
        setDeleteModalState({ isOpen: false, pixelId: '', pixelName: '' });
      }
    } catch {
      // Error
    }
  };

  // Send Test Event
  const handleSendTestEvent = async () => {
    if (!activePixelCode) return;
    setIsSendingTest(true);
    setTestSentSuccess(false);

    try {
      const res = await fetch(`${backendUrl}/api/v1/pixels/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixel_id: activePixelCode,
          event_name: 'test_conversion',
          event_data: { value: 99.0, currency: 'USD', test: true },
          page_url: window.location.href,
          referrer: 'https://xoru.link/dashboard/pixels',
        }),
      });

      if (res.ok) {
        setTestSentSuccess(true);
        setTimeout(() => setTestSentSuccess(false), 3000);
        // Refresh event stream
        const token = await getToken();
        if (xoruPixel) fetchPixelEvents(xoruPixel.id, token);
      }
    } catch {
      // Test failed
    } finally {
      setIsSendingTest(false);
    }
  };

  // Snippets
  const scriptSnippet = `<script defer src="${backendUrl}/x.js" data-pixel="${activePixelCode}"></script>`;
  const gifSnippet = `<img src="${backendUrl}/p/${activePixelCode}.gif" width="1" height="1" alt="" style="display:none;" />`;
  const apiSnippet = `// Track Custom Conversion Events anywhere in your app:
window.xoru?.track('Purchase', {
  amount: 99.00,
  currency: 'USD',
  plan: 'Growth Tier'
});

// Or track Lead / Signup:
window.xoru?.track('SignUp', { method: 'Google OAuth' });`;

  const thirdPartyPixels = pixels.filter((p) => p.platform !== 'xoru');
  const workspaceName = activeWorkspace?.name || 'Workspace';
  const workspaceLogo = getWorkspaceLogo(activeWorkspace);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Retargeting Pixels & Tracking Engine</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
              Edge Powered
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            Collect real-time conversion telemetry and sync audiences across{' '}
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              <img src={workspaceLogo} alt={workspaceName} className="w-3 h-3 rounded object-contain" />
              {workspaceName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchPixels}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
            title="Refresh Pixels"
          >
            <Zap className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Add Tracking Pixel</span>
          </button>
        </div>
      </div>

      {/* 1. FEATURED: XORU NATIVE FIRST-PARTY PIXEL HERO CARD */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl shadow-indigo-950/15">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/40 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 backdrop-blur-xs shadow-inner">
                <Sparkles className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-white">
                    Xoru Native First-Party Pixel SDK
                  </h2>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Edge Collector
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Embed on your external website or HTML email campaigns for sub-10ms first-party attribution & revenue conversion tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTestEvent}
                disabled={isSendingTest}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold text-white border border-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {testSentSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    <span className="text-emerald-300">Test Event Received!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{isSendingTest ? 'Emitting...' : 'Emit Test Event'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Snippet Code Tabs & Box */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-indigo-800/30 pb-2">
              <button
                type="button"
                onClick={() => setActiveSnippetTab('script')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSnippetTab === 'script'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <CodeIcon className="w-3.5 h-3.5" />
                <span>JavaScript Tracker (`/x.js`)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSnippetTab('gif')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSnippetTab === 'gif'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>1x1 Transparent Email GIF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSnippetTab('api')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeSnippetTab === 'api'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Custom Events API (`xoru.track`)</span>
              </button>
            </div>

            {/* Code Box Display */}
            <div className="relative rounded-2xl border border-indigo-800/40 bg-slate-950/80 p-4 font-mono text-xs text-indigo-100/90 shadow-inner">
              <div className="absolute right-3 top-3">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeSnippetTab === 'script'
                        ? scriptSnippet
                        : activeSnippetTab === 'gif'
                        ? gifSnippet
                        : apiSnippet,
                      activeSnippetTab
                    )
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 px-3 py-1.5 text-[11px] font-bold text-white border border-indigo-400/20 transition-all shadow-xs"
                >
                  {copiedSnippet === activeSnippetTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="overflow-x-auto whitespace-pre-wrap pr-24 leading-relaxed">
                {activeSnippetTab === 'script' && scriptSnippet}
                {activeSnippetTab === 'gif' && gifSnippet}
                {activeSnippetTab === 'api' && apiSnippet}
              </pre>

              <div className="mt-3 pt-3 border-t border-indigo-900/50 flex items-center justify-between text-[11px] text-indigo-300/70">
                <span>
                  {activeSnippetTab === 'script' &&
                    '✓ Lightweight (<1.5KB), async, GDPR-compliant edge collector.'}
                  {activeSnippetTab === 'gif' &&
                    '✓ Zero-JS transparent pixel for tracking email open rates & geographic attribution.'}
                  {activeSnippetTab === 'api' &&
                    '✓ Fire custom conversions to measure customer lifetime value & campaign ROAS.'}
                </span>
                <span className="font-mono text-indigo-400/90 font-bold">
                  Pixel ID: {activePixelCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECENT PIXEL TELEMETRY STREAM */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Pixel Telemetry & Conversion Stream
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {events.length} Recent Events
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Auto-refreshed via Cloudflare Edge</span>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {events.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Globe className="w-5 h-5 stroke-[2]" />
              </div>
              <p className="text-xs font-bold text-slate-800">Waiting for First Telemetry Event</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Embed the Xoru Pixel snippet on your website or click &apos;Emit Test Event&apos; above to verify instant data reception.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Event Name</th>
                  <th className="px-4 py-3">Page / URL Target</th>
                  <th className="px-4 py-3">Device & Browser</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 bg-indigo-50/80 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        {evt.event_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 truncate max-w-[240px]">
                      {evt.page_url || evt.referrer || '/'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {evt.device_type || 'Desktop'} • {evt.browser || 'Browser'} ({evt.os || 'OS'})
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">
                      {evt.country || 'Global'} {evt.city ? `(${evt.city})` : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 3. THIRD-PARTY RETARGETING PIXELS (Meta, Google, TikTok, Twitter, LinkedIn) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Connected Third-Party Marketing Pixels
            </h2>
            <p className="text-xs text-slate-500">
              Sync retargeting audiences across Meta, Google Ads, TikTok, Twitter / X, and LinkedIn simultaneously.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {thirdPartyPixels.length} configured
          </span>
        </div>

        {/* Platform Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { platform: 'meta', name: 'Meta Pixel', desc: 'Facebook & Instagram Ads' },
            { platform: 'google', name: 'Google Tag', desc: 'Google Ads & GA4' },
            { platform: 'tiktok', name: 'TikTok Pixel', desc: 'TikTok Ads Manager' },
            { platform: 'twitter', name: 'Twitter / X Tag', desc: 'X Ads Conversion' },
            { platform: 'linkedin', name: 'LinkedIn Insight', desc: 'B2B Matched Audiences' },
          ].map((item) => {
            const count = thirdPartyPixels.filter((p) => p.platform === item.platform).length;
            return (
              <div key={item.platform} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Target className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600">
                    {count} {count === 1 ? 'pixel' : 'pixels'} active
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pixels Table */}
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {thirdPartyPixels.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Target className="w-5 h-5 stroke-[2]" />
              </div>
              <p className="text-xs font-bold text-slate-800">No Third-Party Pixels Connected</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Add your Meta Pixel ID, Google Analytics Measurement ID, or TikTok Tag to retarget visitors automatically.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPlatform('meta');
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add First Ad Pixel</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Platform & Label</th>
                  <th className="px-5 py-3.5">Pixel / Tag ID</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thirdPartyPixels.map((pix) => (
                  <tr key={pix.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 border border-indigo-100">
                          {pix.platform}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{pix.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200/60">
                        {pix.pixel_id}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePixel(pix.id, pix.is_active)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                          pix.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${pix.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{pix.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(pix.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModalState({
                            isOpen: true,
                            pixelId: pix.id,
                            pixelName: pix.name,
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete pixel"
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

      {/* CREATE PIXEL MODAL */}
      <CustomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Marketing / Tracking Pixel"
        description="Provision a native Xoru pixel or connect a 3rd-party advertising tag."
      >
        <form onSubmit={handleCreatePixel} className="space-y-4 pt-1">
          {createError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {createError}
            </div>
          )}

          {/* Platform Selector Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pixel Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'xoru', label: 'Xoru Native Pixel' },
                { id: 'meta', label: 'Meta (Facebook)' },
                { id: 'google', label: 'Google Ads / GA4' },
                { id: 'tiktok', label: 'TikTok Pixel' },
                { id: 'twitter', label: 'Twitter / X Ads' },
                { id: 'linkedin', label: 'LinkedIn Insight' },
              ].map((p) => {
                const isSelected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id as any)}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pixel Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pixel Label / Campaign Name
            </label>
            <input
              type="text"
              value={pixelName}
              onChange={(e) => setPixelName(e.target.value)}
              placeholder="e.g. Q4 Website Retargeting"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Pixel ID Input */}
          {platform !== 'xoru' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pixel / Measurement ID
              </label>
              <input
                type="text"
                required
                value={pixelIdInput}
                onChange={(e) => setPixelIdInput(e.target.value)}
                placeholder={
                  platform === 'meta'
                    ? 'e.g. 984712039485123'
                    : platform === 'google'
                    ? 'e.g. G-XXXXXXXXXX or AW-XXXXXXXXX'
                    : platform === 'tiktok'
                    ? 'e.g. C9812A9B821'
                    : 'e.g. Pixel Tag ID'
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          )}

          {platform === 'xoru' && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-[11px] text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>A unique Xoru first-party tracker ID will be generated automatically.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Saving...' : 'Save Pixel'}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleDeletePixel}
        title="Delete Tracking Pixel"
        itemName={deleteModalState.pixelName}
        description="Are you sure you want to permanently delete this pixel? Associated conversion telemetry and audience tracking will stop immediately."
      />
    </div>
  );
}
