'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  Link2,
  BarChart2,
  Layers,
  Sparkles,
  Target,
  Key,
  Globe,
  ArrowRight,
  Copy,
  Check,
  Zap,
  Shield,
  BookOpen,
  Sliders,
} from '@deemlol/next-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ShortLink } from '@/components/LinksTable';

interface AnalyticsSummary {
  total_clicks: number;
  unique_visitors: number;
  qr_clicks: number;
  clicks_by_date: { date: string; label: string; count: number }[];
}

interface PixelSummary {
  id: string;
  name: string;
  platform: string;
  is_active: boolean;
  events_count: number;
}

interface UsageSummary {
  total_requests: number;
  monthly_limit: number;
  usage_percent: number;
  active_keys_count: number;
  billing_cycle_reset_days: number;
}

export default function DashboardOverviewPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();
  const { activeWorkspace, activeWorkspaceId, getWorkspaceLogo } = useWorkspace();

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [pixels, setPixels] = useState<PixelSummary[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const fetchOverviewData = useCallback(async (wrkId?: string) => {
    setIsLoading(true);
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const wrkQuery = wrkId ? `?workspace_id=${wrkId}` : '';

      // Parallel fetch for bird's-eye view data
      const [linksRes, analyticsRes, pixelsRes, usageRes] = await Promise.all([
        fetch(`${backendUrl}/api/v1/links${wrkQuery}`, { headers }).catch(() => null),
        fetch(`${backendUrl}/api/v1/analytics${wrkQuery ? wrkQuery + '&period=7d' : '?period=7d'}`, { headers }).catch(() => null),
        fetch(`${backendUrl}/api/v1/pixels${wrkQuery}`, { headers }).catch(() => null),
        fetch(`${backendUrl}/api/v1/api-keys/usage${wrkQuery}`, { headers }).catch(() => null),
      ]);

      if (linksRes && linksRes.ok) {
        const data = await linksRes.json();
        setLinks(Array.isArray(data) ? data : []);
      } else {
        setLinks([]);
      }

      if (analyticsRes && analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (pixelsRes && pixelsRes.ok) {
        const data = await pixelsRes.json();
        setPixels(Array.isArray(data) ? data : []);
      }

      if (usageRes && usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted && isUserLoaded && isAuthLoaded) {
      if (!isSignedIn) {
        router.push('/sign-in');
      } else {
        fetchOverviewData(activeWorkspaceId);
      }
    }
  }, [hasMounted, isUserLoaded, isAuthLoaded, isSignedIn, router, fetchOverviewData, activeWorkspaceId]);

  useEffect(() => {
    const handleGlobalCreate = () => fetchOverviewData(activeWorkspaceId);
    window.addEventListener('linkCreated', handleGlobalCreate);
    return () => window.removeEventListener('linkCreated', handleGlobalCreate);
  }, [fetchOverviewData, activeWorkspaceId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!hasMounted || !isUserLoaded || !isAuthLoaded || !user) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="border-b border-slate-200/80 pb-4 space-y-2">
          <div className="h-6 w-48 rounded-lg bg-slate-200/70" />
          <div className="h-3 w-72 rounded bg-slate-100" />
        </div>

        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 rounded bg-slate-200/70" />
                <div className="h-7 w-7 rounded-lg bg-slate-100" />
              </div>
              <div className="h-7 w-16 rounded bg-slate-200/80" />
            </div>
          ))}
        </div>

        {/* 2-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs" />
          <div className="lg:col-span-5 h-72 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs" />
        </div>
      </div>
    );
  }

  const firstName = user.firstName || 'User';
  const lastName = user.lastName || '';
  const workspaceName = activeWorkspace?.name || `${firstName}'s Workspace`;
  const workspaceLogo = getWorkspaceLogo(activeWorkspace);

  const totalLinksCount = links.length;
  const activeLinksCount = links.filter((l) => l.is_active && !l.is_consumed).length;
  const totalClicksCount = analytics?.total_clicks ?? links.reduce((sum, link) => sum + (link.click_count || 0), 0);
  const uniqueVisitorsCount = analytics?.unique_visitors ?? 0;
  const activePixelsCount = pixels.filter((p) => p.is_active).length;
  const totalPixelEvents = pixels.reduce((sum, p) => sum + (p.events_count || 0), 0);

  const recentLinks = links.slice(0, 5);

  const maxClickInSeries = Math.max(1, ...(analytics?.clicks_by_date?.map((d) => d.count) || [1]));

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Executive Workspace Hero Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-lg">
                <img src={workspaceLogo} alt={workspaceName} className="w-4 h-4 rounded object-contain" />
                {workspaceName}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Edge Live
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                {activeWorkspaceId || 'wrk_personal'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Workspace Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Bird&apos;s-eye telemetry, short link routing velocity, retargeting pixels, and developer API metrics across your workspace.
            </p>
          </div>

          {/* Quick Action Buttons Hub */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center shrink-0">
            <Link
              href="/dashboard/links"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              <Link2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Manage Links</span>
            </Link>

            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Full Analytics</span>
            </Link>

            <Link
              href="/dashboard/pixels"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
            >
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pixels</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Bird's-Eye KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Links */}
        <Link
          href="/dashboard/links"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all duration-150 space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Short Links
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 group-hover:scale-105 transition-transform">
              <Link2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : totalLinksCount}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-600 font-semibold">{activeLinksCount} active</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                View all &rarr;
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 2: Total Clicks */}
        <Link
          href="/dashboard/analytics"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all duration-150 space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Click Telemetry (7d)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 group-hover:scale-105 transition-transform">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : totalClicksCount.toLocaleString()}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">{uniqueVisitorsCount} unique visitors</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Reports &rarr;
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 3: Retargeting Pixels */}
        <Link
          href="/dashboard/pixels"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all duration-150 space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tracking Pixels
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/60 group-hover:scale-105 transition-transform">
              <Target className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : activePixelsCount}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">{totalPixelEvents} events captured</span>
              <span className="text-amber-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Pixels &rarr;
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 4: Developer API Usage */}
        <Link
          href="/dashboard/settings"
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all duration-150 space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              API Quota & Keys
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 group-hover:scale-105 transition-transform">
              <Key className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : `${usage?.usage_percent ?? 0}%`}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                {usage?.total_requests ?? 0} / {(usage?.monthly_limit ?? 10000).toLocaleString()} reqs
              </span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Keys &rarr;
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Main 2-Column Bird's-Eye Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Links & Click Velocity (Col Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recent Short Links Widget */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Short Links</h2>
                <p className="text-xs text-slate-500">Latest active links generated in this workspace</p>
              </div>

              <Link
                href="/dashboard/links"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <span>View all {links.length} links</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : recentLinks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Link2 className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">No short links yet</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Create your first intelligent short link with sub-10ms global edge redirects.
                  </p>
                </div>
                <Link
                  href="/dashboard/links"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
                >
                  <span>Go to Links &rarr;</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {recentLinks.map((link) => {
                  const shortUrl = `https://xoru-backend.mridu.workers.dev/${link.custom_slug || link.short_code}`;
                  const isCopied = copiedId === link.id;

                  return (
                    <div
                      key={link.id}
                      className="p-3.5 hover:bg-slate-50/90 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">
                            {link.title || link.destination_url}
                          </span>
                          {link.is_protected && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                              Protected
                            </span>
                          )}
                          {link.is_one_time && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/70">
                              1-Time
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span className="font-semibold text-indigo-600 bg-indigo-50/70 px-1.5 py-0.2 rounded border border-indigo-100/60">
                            /{link.custom_slug || link.short_code}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[150px] sm:max-w-[200px] text-slate-500">{link.destination_url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60 tabular-nums">
                          {link.click_count || 0} clicks
                        </span>

                        <button
                          onClick={() => copyToClipboard(shortUrl, link.id)}
                          className="relative p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all"
                          title="Copy Short URL"
                        >
                          {isCopied ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7-Day Click Velocity Mini Chart */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">7-Day Click Velocity</h2>
                <p className="text-xs text-slate-500">Daily redirect traffic activity across all links</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/80">
                {totalClicksCount} total
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-4 items-end h-36">
              {(analytics?.clicks_by_date || [
                { date: '1', label: 'Mon', count: 0 },
                { date: '2', label: 'Tue', count: 0 },
                { date: '3', label: 'Wed', count: 0 },
                { date: '4', label: 'Thu', count: 0 },
                { date: '5', label: 'Fri', count: 0 },
                { date: '6', label: 'Sat', count: 0 },
                { date: '7', label: 'Sun', count: 0 },
              ]).map((day, idx) => {
                const heightPercent = Math.max(8, Math.round((day.count / maxClickInSeries) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all tabular-nums">
                      {day.count}
                    </span>
                    <div className="w-full bg-slate-50 rounded-t-lg h-24 flex items-end justify-center p-0.5">
                      <div
                        className="w-full max-w-[28px] rounded-t-md bg-indigo-200 group-hover:bg-indigo-600 transition-colors duration-200"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Intelligence & Workspace Hub (Col Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Retargeting Pixels & Tracking Hub */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Retargeting Pixels</h3>
                  <p className="text-[11px] text-slate-500">First-party telemetry & ad pixels</p>
                </div>
              </div>

              <Link
                href="/dashboard/pixels"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                Configure &rarr;
              </Link>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Active Tracker Script</span>
                <span className="font-mono text-indigo-600 font-bold">/x.js</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">1x1 Email Open GIF</span>
                <span className="font-mono text-emerald-600 font-bold">/p/:id.gif</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-600 font-semibold">Configured Ad Tags</span>
                <span className="font-bold text-slate-900">{pixels.length} connected</span>
              </div>
            </div>
          </div>

          {/* Developer API & Integration Status */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Developer API Engine</h3>
                  <p className="text-[11px] text-slate-500">Sub-10ms edge auth & rate limiting</p>
                </div>
              </div>

              <Link
                href="/dashboard/docs"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                API Docs &rarr;
              </Link>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Monthly Request Meter</span>
                <span className="tabular-nums">
                  {usage?.total_requests ?? 0} / {(usage?.monthly_limit ?? 10000).toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, usage?.usage_percent ?? 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-0.5">
                <span>Reset in {usage?.billing_cycle_reset_days ?? 12} days</span>
                <span>{usage?.active_keys_count ?? 1} active key(s)</span>
              </div>
            </div>
          </div>

          {/* Global Edge Infrastructure Badge */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 sm:p-6 text-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                    Xoru Edge Network
                  </h4>
                  <p className="text-[11px] text-slate-300">Global Cloudflare V8 Workers</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                100% Operational
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">Redirect Latency</span>
                <span className="font-bold text-emerald-400">&lt; 10ms (Global KV)</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-medium">Tenant Isolation</span>
                <span className="font-bold text-indigo-300">Neon Postgres RLS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
