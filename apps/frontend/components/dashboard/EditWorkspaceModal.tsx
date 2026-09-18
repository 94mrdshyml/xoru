'use client';

import React, { useState, useEffect } from 'react';
import { CustomModal } from '@/components/ui/CustomModal';
import { Sparkles } from '@deemlol/next-icons';
import { Workspace, getDicebearWorkspaceLogo } from '@/context/WorkspaceContext';

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onSave: (id: string, name: string, logoUrl?: string | null) => Promise<boolean>;
}

export function EditWorkspaceModal({
  isOpen,
  onClose,
  workspace,
  onSave,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [useDicebear, setUseDicebear] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      setLogoUrl(workspace.logo_url || '');
      setUseDicebear(!workspace.logo_url);
      setError(null);
    }
  }, [workspace, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }

    if (!workspace) return;

    setIsSubmitting(true);
    setError(null);

    const finalLogo = useDicebear ? null : logoUrl.trim() || null;
    const success = await onSave(workspace.id, name.trim(), finalLogo);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setError('Failed to update workspace. Please try again.');
    }
  };

  const previewLogo = useDicebear
    ? getDicebearWorkspaceLogo({ ...workspace, name } as Workspace)
    : logoUrl.trim() || getDicebearWorkspaceLogo(workspace);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Workspace"
      description="Update your workspace brand name and visual identity."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Workspace Preview Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
          <img
            src={previewLogo}
            alt={name || 'Workspace'}
            className="w-11 h-11 rounded-xl bg-white p-1 border border-slate-200/80 shadow-sm object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getDicebearWorkspaceLogo(workspace);
            }}
          />
          <div className="truncate">
            <span className="text-xs font-bold text-slate-900 truncate block">
              {name || 'Workspace Name'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {useDicebear ? 'Automated Dicebear Brand Icon' : 'Custom Brand Logo'}
            </span>
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Workspace Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Marketing Projects"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Logo Options */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Workspace Icon
            </label>
            <button
              type="button"
              onClick={() => setUseDicebear(!useDicebear)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {useDicebear ? 'Use Custom URL' : 'Use Dicebear Icon'}
            </button>
          </div>

          {useDicebear ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-[11px] text-indigo-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Automatically generated geometric brand logo seeded by workspace identity.</span>
            </div>
          ) : (
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}
