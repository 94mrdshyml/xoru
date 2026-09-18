'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Link2, BarChart2, Layers } from '@deemlol/next-icons';
import { LinksTable, ShortLink } from '@/components/LinksTable';
import { useWorkspace } from '@/context/WorkspaceContext';

export default function DashboardPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();
  const { activeWorkspace, activeWorkspaceId, getWorkspaceLogo } = useWorkspace();

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  const fetchLinks = useCallback(async (wrkId?: string) => {
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

      const queryUrl = wrkId
        ? `${backendUrl}/api/v1/links?workspace_id=${wrkId}`
        : `${backendUrl}/api/v1/links`;

      const res = await fetch(queryUrl, { headers });
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
        fetchLinks(activeWorkspaceId);
      }
    }
  }, [hasMounted, isUserLoaded, isAuthLoaded, isSignedIn, router, fetchLinks, activeWorkspaceId]);

  useEffect(() => {
    const handleGlobalCreate = () => fetchLinks(activeWorkspaceId);
    window.addEventListener('linkCreated', handleGlobalCreate);
    return () => window.removeEventListener('linkCreated', handleGlobalCreate);
  }, [fetchLinks, activeWorkspaceId]);

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
  const workspaceName = activeWorkspace?.name || `${firstName}'s Workspace`;
  const workspaceLogo = getWorkspaceLogo(activeWorkspace);
  const totalClicks = links.reduce((sum, link) => sum + (link.click_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName} {lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            Overview and performance metrics for{' '}
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <img src={workspaceLogo} alt={workspaceName} className="w-3.5 h-3.5 rounded object-contain" />
              {workspaceName}
            </span>
          </p>
        </div>
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
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : links.length}
            </p>
            <span className="text-xs font-medium text-slate-400">in workspace</span>
          </div>
        </div>

        {/* Total Clicks Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200/90 transition-all duration-150 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Clicks
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading ? '...' : totalClicks}
            </p>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
        </div>

        {/* Workspace Profile Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200/90 transition-all duration-150 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Workspace Environment
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <p className="text-sm font-bold tracking-tight text-slate-900 truncate max-w-[180px]">
              {workspaceName}
            </p>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              RLS Isolated
            </span>
          </div>
        </div>
      </div>

      {/* Main Short Links Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Workspace Short Links</h2>
            <p className="text-xs text-slate-500">Manage and monitor all short links created in this workspace.</p>
          </div>
        </div>

        <LinksTable
          links={links}
          isLoading={isLoading}
          onRefresh={() => fetchLinks(activeWorkspaceId)}
        />
      </div>
    </div>
  );
}
