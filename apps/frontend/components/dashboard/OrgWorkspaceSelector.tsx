'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOrganizationList, useOrganization, useUser } from '@clerk/nextjs';
import {
  ChevronDown,
  Check,
  Plus,
  Layers,
  Sparkles,
  Briefcase,
} from '@deemlol/next-icons';

interface Workspace {
  id: string;
  org_id: string;
  name: string;
  slug: string;
}

interface OrgWorkspaceSelectorProps {
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
}

export function OrgWorkspaceSelector({
  activeWorkspaceId,
  onSelectWorkspace,
}: OrgWorkspaceSelectorProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, isLoaded: isOrgListLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isWrkDropdownOpen, setIsWrkDropdownOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWrkName, setNewWrkName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeOrgName = organization?.name || (user?.firstName ? `${user.firstName}'s Org` : 'Personal Account');
  const activeOrgId = organization?.id || user?.id || 'default_org';

  // Fetch workspaces for current active tenant
  useEffect(() => {
    let isMounted = true;
    async function loadWorkspaces() {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';
      try {
        const res = await fetch(`${backendUrl}/api/v1/workspaces?org_id=${activeOrgId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setWorkspaces(data);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadWorkspaces();
    return () => {
      isMounted = false;
    };
  }, [activeOrgId]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOrgDropdownOpen(false);
        setIsWrkDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ||
    (workspaces.length > 0 ? workspaces[0] : {
      id: `wrk_${activeOrgId.replace(/^(org_|usr_|user_)/, '')}`,
      org_id: activeOrgId,
      name: 'Default Workspace',
      slug: 'default-workspace',
    });

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWrkName.trim()) return;

    setIsSubmitting(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';

    try {
      const res = await fetch(`${backendUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWrkName.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setWorkspaces([...workspaces, created]);
        onSelectWorkspace(created.id);
        setNewWrkName('');
        setIsCreatingWorkspace(false);
        setIsWrkDropdownOpen(false);
      }
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2.5">
      {/* 1. Organization Selector UI */}
      <div className="relative">
        <label className="block px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Organization
        </label>
        <button
          type="button"
          onClick={() => {
            setIsOrgDropdownOpen(!isOrgDropdownOpen);
            setIsWrkDropdownOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 text-left shadow-sm hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-150"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 shrink-0">
              {organization?.imageUrl ? (
                <img
                  src={organization.imageUrl}
                  alt={activeOrgName}
                  className="h-7 w-7 rounded-lg object-cover"
                />
              ) : (
                <span className="text-xs">{activeOrgName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{activeOrgName}</div>
              <div className="text-[10px] font-medium text-slate-400">Organization</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Custom Organization Dropdown Popover */}
        {isOrgDropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-slate-400" />
              <span>Switch Organization</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {/* Personal Account Option */}
              <button
                type="button"
                onClick={() => {
                  setActive?.({ organization: null });
                  setIsOrgDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                  !organization
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="h-5 w-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    P
                  </div>
                  <span className="truncate">Personal Account</span>
                </div>
                {!organization && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>

              {/* Organization Memberships */}
              {isOrgListLoaded &&
                userMemberships?.data?.map((mem) => {
                  const org = mem.organization;
                  const isSelected = organization?.id === org.id;

                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => {
                        setActive?.({ organization: org.id });
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {org.imageUrl ? (
                          <img
                            src={org.imageUrl}
                            alt={org.name}
                            className="h-5 w-5 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-md bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {org.name.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{org.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Workspace Selector UI */}
      <div className="relative">
        <label className="block px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Workspace
        </label>
        <button
          type="button"
          onClick={() => {
            setIsWrkDropdownOpen(!isWrkDropdownOpen);
            setIsOrgDropdownOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 text-left shadow-sm hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-150"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 shrink-0">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentWorkspace.name}
              </div>
              <div className="text-[10px] font-medium text-slate-400 font-mono">
                {currentWorkspace.id.slice(0, 12)}...
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Custom Workspace Dropdown Popover */}
        {isWrkDropdownOpen && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Workspace
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingWorkspace(!isCreatingWorkspace)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>New</span>
              </button>
            </div>

            {isCreatingWorkspace ? (
              <form onSubmit={handleCreateWorkspace} className="p-2 space-y-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Workspace Name"
                  value={newWrkName}
                  onChange={(e) => setNewWrkName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingWorkspace(false)}
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWrkName.trim()}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {/* Default or fetched workspaces */}
                {(workspaces.length > 0 ? workspaces : [currentWorkspace]).map((wrk) => {
                  const isSelected = currentWorkspace.id === wrk.id;

                  return (
                    <button
                      key={wrk.id}
                      type="button"
                      onClick={() => {
                        onSelectWorkspace(wrk.id);
                        setIsWrkDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-5 w-5 rounded-md bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                          <Layers className="w-3 h-3 stroke-[2]" />
                        </div>
                        <span className="truncate">{wrk.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
