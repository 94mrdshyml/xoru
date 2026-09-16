import { UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Link2, Plus, BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { MorphButton } from '@/components/ui/MorphButton';

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const firstName = user.firstName || 'User';
  const lastName = user.lastName || '';
  const email = user.emailAddresses[0]?.emailAddress || '';
  const workspaceName = `${firstName}'s Workspace`;

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
              <MorphButton successText="Link Created!">
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Short Link</span>
              </MorphButton>
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
            <p className="text-3xl font-bold text-slate-900">0</p>
            <p className="text-xs text-slate-500">0 active in current workspace</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Clicks</span>
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">0</p>
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
      </main>
    </div>
  );
}

