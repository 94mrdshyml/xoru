import Link from 'next/link';
import { Link2, ArrowRight, Zap, Shield, Sparkles } from '@deemlol/next-icons';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Link2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span>Xoru</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-sm active:scale-[0.98]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center">
        <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
            <span>Short Link. Real Intelligence.</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-tight">
            Short Links Powered by <span className="text-indigo-600">Real Intelligence</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-600 sm:text-xl">
            Sub-10ms global edge redirects, device & geo dynamic routing, and multi-tenant security isolated with Neon DB Row-Level Security.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98]"
            >
              <span>Start Shortening Free</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-12 max-w-5xl mx-auto text-left">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
              <Zap className="w-6 h-6 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-lg">Sub-10ms Edge Redirects</h3>
              <p className="text-sm text-slate-500">Cloudflare KV edge caching for instant global redirection.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-lg">Multi-Tenant Isolation</h3>
              <p className="text-sm text-slate-500">Clerk Organizations and Neon Postgres Row-Level Security.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
              <Sparkles className="w-6 h-6 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-lg">Dynamic Routing</h3>
              <p className="text-sm text-slate-500">Device, Geo ISO, and A/B split traffic intelligence.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
