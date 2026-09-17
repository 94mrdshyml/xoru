'use client';

import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  Code as QrCode,
  Trash2,
  Check,
  BarChart2,
  Calendar,
  Search,
  Filter,
  Lock,
  Clock,
  Zap,
  Link2,
} from '@deemlol/next-icons';
import { useAuth } from '@clerk/nextjs';
import { QrCodeModal } from './QrCodeModal';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';

export interface ShortLink {
  id: string;
  title: string;
  description?: string | null;
  destination_url: string;
  short_code: string;
  custom_slug?: string | null;
  redirect_type: number;
  is_protected?: boolean;
  is_one_time?: boolean;
  is_consumed?: boolean;
  expires_at?: string | null;
  click_count?: number;
  created_at: string;
}

interface LinksTableProps {
  links: ShortLink[];
  onRefresh: () => void;
  isLoading?: boolean;
  onOpenCreate?: () => void;
}

export function LinksTable({ links, onRefresh, isLoading, onOpenCreate }: LinksTableProps) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalState, setQrModalState] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    linkId: string;
    linkTitle: string;
    shortUrl: string;
  }>({
    isOpen: false,
    linkId: '',
    linkTitle: '',
    shortUrl: '',
  });

  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return links;
    const query = searchQuery.toLowerCase().trim();
    return links.filter(
      (link) =>
        link.title.toLowerCase().includes(query) ||
        link.short_code.toLowerCase().includes(query) ||
        (link.custom_slug && link.custom_slug.toLowerCase().includes(query)) ||
        link.destination_url.toLowerCase().includes(query)
    );
  }, [links, searchQuery]);

  const getPublicShortUrl = (link: ShortLink) => {
    const slug = link.custom_slug || link.short_code;
    return `https://xoru-backend.mridu.workers.dev/${slug}`;
  };

  const handleCopy = async (link: ShortLink) => {
    const url = getPublicShortUrl(link);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const executeDelete = async () => {
    if (!deleteModalState.linkId) return;
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/api/v1/links/${deleteModalState.linkId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        onRefresh();
      }
    } catch {
      // Handle error
    }
  };

  // Skeleton Loading Table State
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Search bar skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-9 w-72 rounded-xl bg-slate-200/70 animate-pulse" />
          <div className="h-4 w-28 rounded bg-slate-200/70 animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex gap-4">
            <div className="h-4 w-1/4 rounded bg-slate-200/70 animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-slate-200/70 animate-pulse" />
            <div className="h-4 w-1/6 rounded bg-slate-200/70 animate-pulse" />
            <div className="h-4 w-1/6 rounded bg-slate-200/70 animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100 p-2 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-40 rounded bg-slate-200/60 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-4 w-48 rounded bg-slate-100 animate-pulse hidden sm:block" />
                <div className="h-6 w-12 rounded-full bg-slate-100 animate-pulse" />
                <div className="h-8 w-24 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Filtering */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            placeholder="Filter by title, slug, or destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end sm:self-center">
          <Filter className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
          <span>
            Showing <strong className="text-slate-700 font-bold tabular-nums">{filteredLinks.length}</strong> of{' '}
            <strong className="text-slate-700 font-bold tabular-nums">{links.length}</strong> link(s)
          </span>
        </div>
      </div>

      {/* Empty State */}
      {filteredLinks.length === 0 ? (
        <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Link2 className="h-7 w-7 stroke-[2]" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">
            {searchQuery ? 'No matching short links found' : 'No short links created yet'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No links matched "${searchQuery}". Try searching with a different slug or title keyword.`
              : 'Create your first short link with sub-10ms global edge redirects, real-time analytics, and dynamic routing.'}
          </p>
          {onOpenCreate && !searchQuery && (
            <div className="mt-5">
              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                <span>+ Create Your First Link</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Data Table */
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] uppercase font-bold tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Title & Short URL</th>
                  <th scope="col" className="px-5 py-3.5">Destination URL</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Clicks</th>
                  <th scope="col" className="px-5 py-3.5">Created</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLinks.map((link) => {
                  const shortUrl = getPublicShortUrl(link);
                  const displaySlug = link.custom_slug || link.short_code;
                  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;

                  return (
                    <tr key={link.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Title & Short Link */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{link.title}</span>
                          
                          {/* Badges */}
                          {link.redirect_type === 302 && (
                            <span className="inline-flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              302 Temp
                            </span>
                          )}
                          {link.is_protected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                              <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>Protected</span>
                            </span>
                          )}
                          {link.is_one_time && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                link.is_consumed
                                  ? 'text-slate-500 bg-slate-100 border-slate-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200/80'
                              }`}
                            >
                              <Zap className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>{link.is_consumed ? 'Burned' : 'One-Time'}</span>
                            </span>
                          )}
                          {link.expires_at && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                isExpired
                                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                                  : 'text-slate-600 bg-slate-100 border-slate-200'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5 stroke-[2]" />
                              <span>{isExpired ? 'Expired' : 'Expiring'}</span>
                            </span>
                          )}
                        </div>

                        {link.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{link.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100/80">
                            /{displaySlug}
                          </span>
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Open short link"
                          >
                            <ExternalLink className="w-3 h-3 stroke-[2]" />
                          </a>
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="px-5 py-3.5 max-w-xs truncate">
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-600 hover:text-slate-900 transition-colors underline-offset-2 hover:underline truncate block"
                          title={link.destination_url}
                        >
                          {link.destination_url}
                        </a>
                      </td>

                      {/* Total Clicks */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-slate-800 bg-slate-100/90 px-2.5 py-1 rounded-full border border-slate-200/60">
                          <BarChart2 className="w-3 h-3 text-indigo-600 stroke-[2.5]" />
                          {link.click_count || 0}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 stroke-[2]" />
                          {new Date(link.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(link)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Copy short link"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <Copy className="w-4 h-4 stroke-[2]" />
                            )}
                          </button>

                          {/* QR Code button */}
                          <button
                            type="button"
                            onClick={() =>
                              setQrModalState({
                                isOpen: true,
                                url: shortUrl,
                                title: link.title,
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="View QR Code"
                          >
                            <QrCode className="w-4 h-4 stroke-[2]" />
                          </button>

                          {/* Custom Delete button */}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModalState({
                                isOpen: true,
                                linkId: link.id,
                                linkTitle: link.title,
                                shortUrl,
                              })
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete short link"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={qrModalState.isOpen}
        onClose={() => setQrModalState({ ...qrModalState, isOpen: false })}
        shortUrl={qrModalState.url}
        title={qrModalState.title}
      />

      {/* Impeccable Custom Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={executeDelete}
        title="Delete Short Link"
        itemName={deleteModalState.linkTitle || deleteModalState.shortUrl}
        description="Are you sure you want to permanently delete this short link? All edge redirects for this code will stop working immediately."
      />
    </div>
  );
}
