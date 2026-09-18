'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Plus, Link2 } from '@deemlol/next-icons';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenCreateModal: () => void;
}

export function Header({ onOpenMobileSidebar, onOpenCreateModal }: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === '/dashboard/analytics') return 'Analytics';
    if (pathname === '/dashboard/routes') return 'Smart Routes';
    if (pathname === '/dashboard/pixels') return 'Retargeting Pixels';
    if (pathname === '/dashboard/settings') return 'Developer Settings';
    if (pathname === '/dashboard/docs') return 'API Documentation';
    return 'Overview';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Mobile Menu & Page Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="flex items-center gap-2 lg:hidden font-bold text-slate-900 text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Link2 className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span>Xoru</span>
        </div>

        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="text-slate-500">Dashboard</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-bold">{getPageTitle()}</span>
        </nav>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create Link</span>
        </button>
      </div>
    </header>
  );
}
