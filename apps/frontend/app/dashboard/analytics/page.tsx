'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  BarChart2,
  Globe,
  Smartphone,
  Zap,
  TrendingUp,
  Users,
  Calendar,
  Layers,
  Compass,
  Link2,
} from '@deemlol/next-icons';
import { ShortLink } from '@/components/LinksTable';

interface AnalyticsData {
  total_clicks: number;
  unique_visitors: number;
  qr_clicks: number;
  clicks_by_date: { date: string; label: string; count: number }[];
  top_devices: { device: string; count: number; percent: number }[];
  top_os: { os: string; count: number; percent: number }[];
  top_countries: { code: string; name: string; count: number; percent: number }[];
  top_referrers: { referrer: string; count: number; percent: number }[];
}

const DEFAULT_ANALYTICS: AnalyticsData = {
  total_clicks: 0,
  unique_visitors: 0,
  qr_clicks: 0,
  clicks_by_date: [],
  top_devices: [],
  top_os: [],
  top_countries: [],
  top_referrers: [],
};

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AnalyticsData>(DEFAULT_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);

  // Fetch short links list for filter dropdown
  const fetchLinks = useCallback(async () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/links`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
      }
    } catch {
      // Graceful fallback
    }
  }, [getToken]);

  // Fetch telemetry analytics
  const fetchAnalytics = useCallback(async (linkId: string) => {
    setIsFetchingAnalytics(true);
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const query = new URLSearchParams();
      query.set('period', '7d');
      if (linkId !== 'all') {
        query.set('link_id', linkId);
      }

      const res = await fetch(`${backendUrl}/api/v1/analytics?${query.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsFetchingAnalytics(false);
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  useEffect(() => {
    fetchAnalytics(selectedLinkId);
  }, [fetchAnalytics, selectedLinkId]);

  const totalClicks = analytics.total_clicks;
  const uniqueVisitors = analytics.unique_visitors;
  const qrClicks = analytics.qr_clicks;

  // Chart calculation
  const maxDayVal = Math.max(
    ...(analytics.clicks_by_date?.map((d) => d.count) || [1]),
    1
  );

  const deviceColorMap: Record<string, string> = {
    desktop: 'bg-indigo-600',
    mobile: 'bg-indigo-500',
    tablet: 'bg-indigo-400',
    bot: 'bg-slate-400',
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="border-b border-slate-200/80 pb-4 space-y-2">
          <div className="h-6 w-48 rounded bg-slate-200/70" />
          <div className="h-3 w-64 rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-4" />
          ))}
        </div>
        <div className="h-72 rounded-2xl border border-slate-200 bg-white p-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Link Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Real-Time Edge Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time click telemetry, country ISO distributions, device intelligence, and referrer insights.
          </p>
        </div>

        {/* Link Filter Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Filter:</label>
          <select
            value={selectedLinkId}
            onChange={(e) => setSelectedLinkId(e.target.value)}
            disabled={isFetchingAnalytics}
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
          >
            <option value="all">All Short Links ({links.length})</option>
            {links.map((link) => (
              <option key={link.id} value={link.id}>
                {link.title} (/{link.custom_slug || link.short_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Clicks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Clicks</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{totalClicks}</p>
            <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unique Visitors</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{uniqueVisitors}</p>
            <span className="text-xs font-medium text-slate-400">anonymized IP</span>
          </div>
        </div>

        {/* Edge Cache Hit Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Edge KV Cache</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Zap className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">99.8%</p>
            <span className="text-xs font-medium text-emerald-600">Global Edge</span>
          </div>
        </div>

        {/* QR Code Clicks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">QR Code Scans</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Globe className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{qrClicks}</p>
            <span className="text-xs font-medium text-slate-400">scans</span>
          </div>
        </div>
      </div>

      {/* Volume Chart Over Time */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-sm font-bold text-slate-900">Traffic Activity (Last 7 Days)</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">Live Ingestion</span>
        </div>

        {totalClicks === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No click data recorded yet for this selection. Share your short link to view real-time traffic charts.
          </div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end justify-between gap-2 h-44 px-2">
              {analytics.clicks_by_date?.map((item) => {
                const heightPercent = item.count > 0 ? Math.max(Math.round((item.count / maxDayVal) * 100), 8) : 4;

                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[11px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                      {item.count}
                    </span>
                    <div className="w-full bg-slate-100/80 rounded-t-lg h-36 flex items-end justify-center p-1">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[42px] bg-indigo-600 hover:bg-indigo-700 rounded-t-md transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Three Breakdown Cards: Devices, Geographies & Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-sm font-bold text-slate-900">Device Platform</h2>
          </div>

          {analytics.top_devices?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No device telemetry yet.</div>
          ) : (
            <div className="space-y-3 pt-1">
              {analytics.top_devices.map((d) => (
                <div key={d.device} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 capitalize">{d.device}</span>
                    <span className="text-slate-900 tabular-nums font-bold">
                      {d.count} ({d.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${d.percent}%` }}
                      className={`h-full ${deviceColorMap[d.device.toLowerCase()] || 'bg-indigo-600'} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geographic Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-sm font-bold text-slate-900">Top Geographies</h2>
          </div>

          {analytics.top_countries?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No geo data recorded yet.</div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {analytics.top_countries.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3.5 py-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {c.code}
                    </span>
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 tabular-nums">{c.count}</span>
                    <span className="text-[11px] text-slate-400">({c.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600 stroke-[2]" />
            <h2 className="text-sm font-bold text-slate-900">Top Referrers</h2>
          </div>

          {analytics.top_referrers?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No referrer sources yet.</div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {analytics.top_referrers.map((r) => (
                <div
                  key={r.referrer}
                  className="flex items-center justify-between rounded-xl bg-slate-50/70 px-3.5 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate max-w-[120px]">{r.referrer}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 tabular-nums">{r.count}</span>
                    <span className="text-[11px] text-slate-400">({r.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
