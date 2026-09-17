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
  Settings,
  Plus,
  Zap,
  X,
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
      badge: null,
    },
    {
      name: 'Analytics Engine',
      href: '/dashboard/analytics',
      icon: BarChart3,
      badge: 'Edge',
    },
    {
      name: 'Smart Routes',
      href: '/dashboard/routes',
      icon: GitFork,
      badge: null,
    },
    {
      name: 'Pixels & Retargeting',
      href: '/dashboard/pixels',
      icon: Target,
      badge: null,
    },
    {
      name: 'API Keys & Secrets',
      href: '/dashboard/settings',
      icon: KeyRound,
      badge: null,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between bg-slate-900 text-slate-300">
      {/* Top Brand Header */}
      <div className="p-5 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Link2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white">Xoru</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                Short Link. Real Intelligence.
              </span>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Organization Switcher Surface */}
        <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 shadow-inner">
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-full flex justify-between items-center px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition-colors',
                organizationPreviewTextContainer: 'text-left',
                organizationSwitcherTriggerIcon: 'text-slate-400',
              },
            }}
          />
        </div>

        {/* Create Short Link Quick CTA */}
        <button
          onClick={onOpenCreateModal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Short Link</span>
        </button>

        {/* Navigation Items List */}
        <nav className="space-y-1 pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 stroke-[2] ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="rounded-md bg-indigo-950 px-2 py-0.5 text-[10px] font-bold tracking-wider text-indigo-400 border border-indigo-800/50">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Edge Badge & User Identity */}
      <div className="border-t border-slate-800/80 p-4 space-y-4 bg-slate-950/40">
        {/* Sub-10ms Edge Indicator Card */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-200">Cloudflare KV Active</span>
            <span className="block text-[11px] font-medium text-slate-400">Sub-10ms Edge Redirects</span>
          </div>
        </div>

        {/* User Identity Profile */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <UserButton showName />
          </div>
          <Link
            href="/dashboard/settings"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 stroke-[2]" />
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-800 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

