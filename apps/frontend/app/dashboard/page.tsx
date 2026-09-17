'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Link2, Plus, BarChart3, Settings, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { LinksTable, ShortLink } from '@/components/LinksTable';
import { CreateLinkModal } from '@/components/CreateLinkModal';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';
    try {
      const res = await fetch(`${backendUrl}/api/v1/links`, {
        headers: {
          'X-Tenant-Id': 'org_dev_demo_workspace',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    } else if (isSignedIn) {
      fetchLinks();
    }
  }, [isLoaded, isSignedIn, router, fetchLinks]);

  // Listen for global modal triggers or creation events
  useEffect(() => {
    const handleGlobalCreate = () => fetchLinks();
    window.addEventListener('linkCreated', handleGlobalCreate);
    return () => window.removeEventListener('linkCreated', handleGlobalCreate);
  }, [fetchLinks]);

  if (!isLoaded || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const firstName = user.firstName || 'User';
  const lastName = user.lastName || '';
  const email = user.emailAddresses[0]?.emailAddress || '';
  const workspaceName = `${firstName}'s Workspace`;

  const totalClicks = links.reduce((sum, link) => sum + (link.click_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
              <span>Multi-Tenant RLS Isolated</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {firstName} {lastName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Active Workspace: <strong className="text-slate-800">{workspaceName}</strong> ({email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Short Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Metrics Overview Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Short Links</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Link2 className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{links.length}</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
            <span>{links.length} active in workspace</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Edge Clicks</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BarChart3 className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalClicks}</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Zap className="w-3.5 h-3.5 stroke-[2]" />
            <span>Sub-10ms Cloudflare KV</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Workspace Context</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Settings className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 truncate">{workspaceName}</p>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
            <span>Neon DB RLS Protected</span>
          </div>
        </div>
      </div>

      {/* Short Links Data Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Your Short Links</h2>
          <span className="text-xs font-semibold text-slate-500">
            {links.length} {links.length === 1 ? 'link' : 'links'} total
          </span>
        </div>

        <LinksTable links={links} onRefresh={fetchLinks} isLoading={isLoading} />
      </div>

      {/* Create Short Link Modal */}
      <CreateLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLinkCreated={fetchLinks}
        workspaceId="wrk_default"
      />
    </div>
  );
}
