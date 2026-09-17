'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CustomModal } from './ui/CustomModal';
import { MorphButton } from './ui/MorphButton';
import { Link2, Sparkles, AlertCircle, Lock, Calendar, Clock, Zap } from '@deemlol/next-icons';

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
  const { getToken } = useAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [redirectType, setRedirectType] = useState<number>(302);
  const [password, setPassword] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setDestinationUrl('');
    setTitle('');
    setDescription('');
    setCustomSlug('');
    setRedirectType(302);
    setPassword('');
    setIsOneTime(false);
    setExpiresAt('');
    setShowAdvanced(false);
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

      const payload: Record<string, any> = {
        workspace_id: activeWorkspaceId,
        title: title.trim(),
        destination_url: destinationUrl.trim(),
        custom_slug: customSlug.trim() || undefined,
        redirect_type: redirectType,
      };

      if (description.trim()) {
        payload.description = description.trim();
      }
      if (password.trim()) {
        payload.password = password.trim();
      }
      if (isOneTime) {
        payload.is_one_time = true;
      }
      if (expiresAt) {
        payload.expires_at = new Date(expiresAt).toISOString();
      }

      const res = await fetch(`${backendUrl}/api/v1/links`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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
      title="Create Intelligent Short Link"
      description="Create a high-performance short link with custom routing, password security, or one-time burn."
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-0.5">
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

        {/* Link Description (Internal Context) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal lowercase">(optional notes)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Add context, target audience, or campaign details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
          />
        </div>

        {/* Advanced Security & Expiration Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>{showAdvanced ? '− Hide Privacy & Expiration Settings' : '+ Password Protection & Expiry Settings'}</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-4 animate-in fade-in-0 duration-200">
            {/* Password Protection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password Protection <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2]" />
                <input
                  type="password"
                  placeholder="Set access password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Visitors must enter this password before being redirected.</p>
            </div>

            {/* Expiration Date & Time */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Link Expiration <span className="text-slate-400 font-normal lowercase">(optional cutoff)</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2]" />
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>

            {/* One-Time Link Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600 stroke-[2]" />
                  <span className="text-xs font-bold text-slate-900">One-Time Link (Burn After Click)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Automatically deactivates and self-destructs after the first visitor accesses it.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOneTime}
                  onChange={(e) => setIsOneTime(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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

