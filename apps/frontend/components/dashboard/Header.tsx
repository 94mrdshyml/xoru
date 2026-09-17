'use client';

import React from 'react';
import { Menu, ShieldCheck, Zap, Plus, Link2 } from 'lucide-react';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCreateModal: () => void;
}

export function Header({ onOpenMobileSidebar, onOpenCreateModal }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Mobile Toggle & Brand Indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2 lg:hidden font-bold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Link2 className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span>Xoru</span>
        </div>
      </div>

      {/* Status Badges & Quick Action CTA */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
          <span>Multi-Tenant RLS</span>
        </div>

        <div className="hidden md:inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <Zap className="w-3.5 h-3.5 stroke-[2]" />
          <span>KV Edge Sub-10ms</span>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Link</span>
        </button>
      </div>
    </header>
  );
}

