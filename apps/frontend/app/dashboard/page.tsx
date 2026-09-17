'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Link2, BarChart2, Layers } from 'lucide-react';
import { LinksTable, ShortLink } from '@/components/LinksTable';

export default function DashboardPage() {
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();

  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';
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
    if (isUserLoaded && isAuthLoaded) {
      if (!isSignedIn) {
        router.push('/sign-in');
      } else {
        fetchLinks();
      }
    }
  }, [isUserLoaded, isAuthLoaded, isSignedIn, router, fetchLinks]);

  useEffect(() => {
    const handleGlobalCreate = () => fetchLinks();
    window.addEventListener('linkCreated', handleGlobalCreate);
    return () => window.removeEventListener('linkCreated', handleGlobalCreate);
  }, [fetchLinks]);

  if (!isUserLoaded || !isAuthLoaded || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
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
          Overview and link performance for <strong className="text-slate-700 font-semibold">{workspaceName}</strong>
        </p>
      </div>

      {/* Metrics Overview Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Links Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Short Links
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Link2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{links.length}</p>
            <span className="text-xs font-medium text-slate-500">active links</span>
          </div>
        </div>

        {/* Total Clicks Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Clicks
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <BarChart2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{totalClicks}</p>
            <span className="text-xs font-medium text-emerald-600">real-time tracked</span>
          </div>
        </div>

        {/* Active Workspace Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-colors space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Workspace
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-base font-bold text-slate-900 truncate max-w-[180px]">{workspaceName}</p>
            <span className="text-xs font-medium text-slate-500">Organization</span>
          </div>
        </div>
      </div>

      {/* Short Links Data Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Short Links</h2>
          <span className="text-xs font-medium text-slate-500">
            {links.length} {links.length === 1 ? 'link' : 'links'} total
          </span>
        </div>

        <LinksTable links={links} onRefresh={fetchLinks} isLoading={isLoading} />
      </div>
    </div>
  );
}
