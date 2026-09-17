'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CustomModal } from './ui/CustomModal';
import { MorphButton } from './ui/MorphButton';
import { Link2, Sparkles, AlertCircle } from '@deemlol/next-icons';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkCreated: () => void;
  workspaceId: string;
}

export function CreateLinkModal({
  isOpen,
  onClose,
  onLinkCreated,
  workspaceId,
}: CreateLinkModalProps) {
  const { getToken, userId } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [redirectType, setRedirectType] = useState<number>(302);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setDestinationUrl('');
    setTitle('');
    setCustomSlug('');
    setRedirectType(302);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (!destinationUrl.trim() || !title.trim()) {
      setErrorMsg('Please provide both a destination URL and a link title.');
      throw new Error('Validation failed');
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const activeWorkspaceId =
        workspaceId && workspaceId.startsWith('wrk_') ? workspaceId : undefined;

      const res = await fetch(`${backendUrl}/api/v1/links`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          title: title.trim(),
          destination_url: destinationUrl.trim(),
          custom_slug: customSlug.trim() || undefined,
          redirect_type: redirectType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const message = errData?.error?.message || 'Failed to create short link.';
        setErrorMsg(message);
        throw new Error(message);
      }

      onLinkCreated();
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      if (!errorMsg) {
        setErrorMsg(err.message || 'An error occurred while creating the link.');
      }
      throw err;
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Short Link"
      description="Transform any destination URL into an intelligent short link."
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 pt-1">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 animate-in fade-in-0 duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Destination URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Destination URL <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2]" />
            <input
              type="url"
              required
              placeholder="https://example.com/very-long-campaign-url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Link Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Link Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Q4 Marketing Campaign"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>

        {/* Custom Slug & Redirect Type Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Custom Slug <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-colors">
              <span className="text-xs font-bold text-indigo-600 select-none mr-1">xoru.link/</span>
              <input
                type="text"
                placeholder="custom-alias"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Redirect Type
            </label>
            <select
              value={redirectType}
              onChange={(e) => setRedirectType(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer"
            >
              <option value={302}>302 Found (Temporary - Default)</option>
              <option value={301}>301 Moved Permanently</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <MorphButton onAsyncClick={handleSubmit} successText="Link Created!">
            <Sparkles className="w-4 h-4 stroke-[2]" />
            <span>Create Short Link</span>
          </MorphButton>
        </div>
      </form>
    </CustomModal>
  );
}
