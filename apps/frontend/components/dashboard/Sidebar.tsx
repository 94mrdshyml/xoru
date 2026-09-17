'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import {
  Link2,
  LayoutDashboard,
  BarChart3,
  GitFork,
  Target,
  KeyRound,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  onOpenCreateModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onOpenCreateModal, isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview & Links',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
    },
    {
      name: 'Smart Routes',
      href: '/dashboard/routes',
      icon: GitFork,
    },
    {
      name: 'Pixels',
      href: '/dashboard/pixels',
      icon: Target,
    },
    {
      name: 'API Keys',
      href: '/dashboard/settings',
      icon: KeyRound,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between bg-white text-slate-700 border-r border-slate-200/80">
      {/* Top Brand & Workspace Header */}
      <div className="p-4 space-y-5">
        <div className="flex items-center justify-between px-1">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Link2 className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900">Xoru</span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                PRO
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Organization Switcher Surface */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-1.5">
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-full flex justify-between items-center px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200/80',
                organizationPreviewTextContainer: 'text-left font-medium text-slate-900 text-xs',
                organizationSwitcherTriggerIcon: 'text-slate-400 w-3.5 h-3.5',
              },
            }}
          />
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={onOpenCreateModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Short Link</span>
        </button>

        {/* Navigation Section */}
        <div className="space-y-1 pt-1">
          <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onCloseMobile?.()}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 stroke-[2] ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile Surface */}
      <div className="border-t border-slate-100 p-3.5 bg-slate-50/50">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
            <UserButton showName />
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <Sparkles className="w-3 h-3 stroke-[2]" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-60 lg:flex-col shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 max-w-full shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
