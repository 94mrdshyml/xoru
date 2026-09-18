'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  Link2,
  Layout,
  BarChart2,
  GitBranch,
  Target,
  Key,
  BookOpen,
  X,
  Sparkles,
} from '@deemlol/next-icons';
import { WorkspaceSelector } from './WorkspaceSelector';

interface SidebarProps {
  onOpenCreateModal?: () => void;
  activeWorkspaceId?: string;
  onSelectWorkspace?: (workspaceId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: Layout,
    },
    {
      name: 'Links',
      href: '/dashboard/links',
      icon: Link2,
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart2,
    },
    {
      name: 'Smart Routes',
      href: '/dashboard/routes',
      icon: GitBranch,
    },
    {
      name: 'Pixels',
      href: '/dashboard/pixels',
      icon: Target,
    },
    {
      name: 'API Keys',
      href: '/dashboard/settings',
      icon: Key,
    },
    {
      name: 'API Docs',
      href: '/dashboard/docs',
      icon: BookOpen,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full w-full flex-col justify-between bg-white text-slate-700 border-r border-slate-200/80">
      {/* Top Brand & Workspace Header */}
      <div className="p-4 space-y-4">
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

        {/* Workspace Selector UI */}
        <WorkspaceSelector />

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
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-700 font-bold border border-indigo-100/70 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 stroke-[2] transition-colors ${
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile Surface */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonBox: 'flex flex-row-reverse items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors',
                userButtonOuterIdentifier: 'text-xs font-bold text-slate-900',
                userButtonAvatarBox: 'h-8 w-8 rounded-xl border border-slate-200/90 shadow-2xs',
              },
            }}
          />
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
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
