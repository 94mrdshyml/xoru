'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Check,
  Plus,
  Edit,
  Trash,
} from '@deemlol/next-icons';
import { useWorkspace, Workspace } from '@/context/WorkspaceContext';
import { EditWorkspaceModal } from './EditWorkspaceModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

export function WorkspaceSelector() {
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceLogo,
  } = useWorkspace();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / Delete State
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsSubmitting(true);
    const created = await createWorkspace(newWorkspaceName.trim());
    setIsSubmitting(false);

    if (created) {
      setNewWorkspaceName('');
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleEditSave = async (id: string, name: string, logoUrl?: string | null) => {
    const res = await updateWorkspace(id, name, logoUrl);
    return Boolean(res);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWorkspace) return;
    await deleteWorkspace(deletingWorkspace.id);
    setDeletingWorkspace(null);
  };

  const activeName = activeWorkspace?.name || 'Workspace';
  const activeLogo = getWorkspaceLogo(activeWorkspace);

  return (
    <div ref={containerRef} className="relative">
      <label className="block px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Active Workspace
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2 text-left shadow-sm hover:border-indigo-300 hover:bg-slate-50/50 transition-all duration-150"
      >
        <div className="flex items-center gap-2.5 truncate">
          <img
            src={activeLogo}
            alt={activeName}
            className="w-7 h-7 rounded-lg bg-indigo-50/70 p-0.5 border border-slate-200/80 shadow-xs shrink-0 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getWorkspaceLogo(null);
            }}
          />
          <div className="truncate">
            <div className="text-xs font-bold text-slate-900 truncate">{activeName}</div>
            <div className="text-[10px] font-medium text-slate-400 truncate">
              {workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Workspaces</span>
            <span className="text-[9px] font-mono text-slate-400">{workspaces.length} Total</span>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1">
            {workspaces.map((wrk) => {
              const isSelected = activeWorkspaceId === wrk.id || (!activeWorkspaceId && wrk === workspaces[0]);
              const logo = getWorkspaceLogo(wrk);

              return (
                <div
                  key={wrk.id}
                  className={`group flex items-center justify-between rounded-xl p-1.5 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/90 text-indigo-900'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveWorkspaceId(wrk.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2.5 flex-1 truncate text-left"
                  >
                    <img
                      src={logo}
                      alt={wrk.name}
                      className="w-6 h-6 rounded-md bg-white p-0.5 border border-slate-200/80 shadow-2xs shrink-0 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getWorkspaceLogo(null);
                      }}
                    />
                    <span className="text-xs font-semibold truncate flex-1">{wrk.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mr-1" />}
                  </button>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      title="Edit Workspace"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkspace(wrk);
                        setIsOpen(false);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/60 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        title="Delete Workspace"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingWorkspace(wrk);
                          setIsOpen(false);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inline Form or Add Button */}
          <div className="pt-1 mt-1 border-t border-slate-100">
            {isCreating ? (
              <form onSubmit={handleCreateWorkspace} className="p-1 space-y-2">
                <input
                  type="text"
                  placeholder="New workspace name..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newWorkspaceName.trim()}
                    className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50/70 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create New Workspace</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      <EditWorkspaceModal
        isOpen={Boolean(editingWorkspace)}
        onClose={() => setEditingWorkspace(null)}
        workspace={editingWorkspace}
        onSave={handleEditSave}
      />

      {/* Delete Workspace Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingWorkspace)}
        onClose={() => setDeletingWorkspace(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Workspace"
        itemName={deletingWorkspace?.name}
        description={`Are you sure you want to delete "${deletingWorkspace?.name}"? All associated short links, dynamic smart routes, and analytics will be permanently destroyed.`}
      />
    </div>
  );
}
