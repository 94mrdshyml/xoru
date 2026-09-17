'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Link2, BarChart2, Layers } from '@deemlol/next-icons';
import { LinksTable, ShortLink } from '@/components/LinksTable';

export default function DashboardPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  const fetchLinks = useCallback(async () => {
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

      const res = await fetch(`${backendUrl}/api/v1/links`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
      } else {
        setLinks([]);
      }
    } catch {
      setLinks([]);
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
        fetchLinks();
      }
    }
  }, [hasMounted, isUserLoaded, isAuthLoaded, isSignedIn, router, fetchLinks]);

  useEffect(() => {
    const handleGlobalCreate = () => fetchLinks();
    window.addEventListener('linkCreated', handleGlobalCreate);
    return () => window.removeEventListener('linkCreated', handleGlobalCreate);
  }, [fetchLinks]);

  if (!hasMounted || !isUserLoaded || !isAuthLoaded || !user) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="border-b border-slate-200/80 pb-4 space-y-2">
          <div className="h-6 w-48 rounded-lg bg-slate-200/70" />
          <div className="h-3 w-72 rounded bg-slate-100" />
        </div>

        {/* Metrics grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 rounded bg-slate-200/70" />
                <div className="h-7 w-7 rounded-lg bg-slate-100" />
              </div>
              <div className="h-7 w-16 rounded bg-slate-200/80" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="h-64 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm" />
      </div>
    );
  }

  const firstName = user.firstName || 'User';
  const lastName = user.lastName || '';
  const workspaceName = `${firstName}'s Workspace`;
  const totalClicks = links.reduce((sum, link) => sum + (link.click_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Overview Bar */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Welcome back, {firstName} {lastName}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Overview and performance metrics for <strong className="text-slate-700 font-semibold">{workspaceName}</strong>
        </p>
      </div>

      {/* Metrics Overview Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Links Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200/90 transition-all duration-150 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Short Links
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60">
              <Link2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{links.length}</p>
            <span className="text-xs font-semibold text-slate-400">active links</span>
          </div>
        </div>

        {/* Total Clicks Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-200/90 transition-all duration-150 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Clicks Tracked
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{totalClicks}</p>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
              real-time edge
            </span>
          </div>
        </div>

        {/* Active Workspace Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-slate-300 transition-all duration-150 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Environment
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{workspaceName}</p>
            <span className="text-[11px] font-medium text-slate-400">Personal</span>
          </div>
        </div>
      </div>

      {/* Short Links Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">All Short Links</h2>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {links.length} {links.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <LinksTable
          links={links}
          onRefresh={fetchLinks}
          isLoading={isLoading}
          onOpenCreate={() => {
            const createBtn = document.querySelector('header button');
            if (createBtn instanceof HTMLElement) createBtn.click();
          }}
        />
      </div>
    </div>
  );
}
