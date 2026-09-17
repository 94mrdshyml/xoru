'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ChevronDown,
  Check,
  Plus,
  Layers,
  Sparkles,
} from '@deemlol/next-icons';

interface Workspace {
  id: string;
  user_id: string;
  name: string;
  slug: string;
}

interface WorkspaceSelectorProps {
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
}

export function WorkspaceSelector({
  activeWorkspaceId,
  onSelectWorkspace,
}: WorkspaceSelectorProps) {
  const { getToken, userId } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch workspaces for current user
  const fetchWorkspaces = async () => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (userId) {
        headers['X-Tenant-Id'] = userId;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/api/v1/workspaces`, { headers });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (data.length > 0 && (!activeWorkspaceId || activeWorkspaceId === 'wrk_default')) {
          onSelectWorkspace(data[0].id);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [userId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
  const activeName = activeWorkspace?.name || 'Workspace';

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (userId) {
        headers['X-Tenant-Id'] = userId;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        setWorkspaces((prev) => [...prev, created]);
        onSelectWorkspace(created.id);
        setNewWorkspaceName('');
        setIsCreating(false);
        setIsOpen(false);
      }
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Workspace
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 text-left shadow-sm hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-150"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 shrink-0">
            <Layers className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-slate-900 truncate">{activeName}</div>
            <div className="text-[10px] font-medium text-slate-400">Personal Workspace</div>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Select Workspace</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {workspaces.map((wrk) => {
              const isSelected = activeWorkspaceId === wrk.id || (!activeWorkspaceId && wrk === workspaces[0]);

              return (
                <button
                  key={wrk.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(wrk.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="h-5 w-5 rounded-md bg-indigo-100/70 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                      {wrk.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{wrk.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Inline Form or Add Button */}
          <div className="pt-1 mt-1 border-t border-slate-100">
            {isCreating ? (
              <form onSubmit={handleCreateWorkspace} className="p-1 space-y-2">
                <input
                  type="text"
                  placeholder="Workspace name..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWorkspaceName.trim()}
                    className="flex-1 rounded-lg bg-indigo-600 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50/70 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
