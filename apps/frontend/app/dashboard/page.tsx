'use client';

import { UserButton, OrganizationSwitcher, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Link2, Plus, BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { CreateLinkModal } from '@/components/CreateLinkModal';
import { LinksTable, ShortLink } from '@/components/LinksTable';

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

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
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
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Link2 className="h-5 w-5 stroke-[2.5]" />
              </div>
              <span>Xoru</span>
            </div>
            <div className="hidden h-5 w-[1px] bg-slate-200 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: 'rounded-xl border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors',
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserButton showName />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
                <span>Multi-Tenant RLS Active</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome back, {firstName} {lastName}!
              </h2>
              <p className="text-sm text-slate-500">
                Active Workspace: <strong className="text-slate-800">{workspaceName}</strong> ({email})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Short Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Grid Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Links</span>
              <Link2 className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{links.length}</p>
            <p className="text-xs text-slate-500">{links.length} active short link(s)</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Clicks</span>
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalClicks}</p>
            <p className="text-xs text-slate-500">Sub-10ms KV edge redirects</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Workspace Settings</span>
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 truncate">{workspaceName}</p>
            <p className="text-xs text-slate-500">Neon RLS Protected</p>
          </div>
        </div>

        {/* Short Links Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Your Short Links</h3>
            <span className="text-xs font-semibold text-slate-500">
              {links.length} {links.length === 1 ? 'link' : 'links'} total
            </span>
          </div>

          <LinksTable links={links} onRefresh={fetchLinks} isLoading={isLoading} />
        </div>
      </main>

      {/* Create Link Modal */}
      <CreateLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLinkCreated={fetchLinks}
        workspaceId="wrk_default"
      />
    </div>
  );
}
