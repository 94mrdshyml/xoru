'use client';

import React, { useState, useMemo } from 'react';
import { ExternalLink, Copy, QrCode, Trash2, Check, BarChart2, Calendar, Search, Filter } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { QrCodeModal } from './QrCodeModal';

export interface ShortLink {
  id: string;
  title: string;
  destination_url: string;
  short_code: string;
  custom_slug?: string | null;
  redirect_type: number;
  click_count?: number;
  created_at: string;
}

interface LinksTableProps {
  links: ShortLink[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export function LinksTable({ links, onRefresh, isLoading }: LinksTableProps) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrModalState, setQrModalState] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
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

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this short link? This action cannot be undone.')) {
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xoru-backend.mridu.workers.dev';

    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${backendUrl}/api/v1/links/${linkId}`, {
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

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-3 text-sm font-semibold text-slate-500">Loading your short links...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Search & Metrics Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2]" />
          <input
            type="text"
            placeholder="Search links by title, slug, or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end sm:self-center">
          <Filter className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
          <span>Showing {filteredLinks.length} of {links.length} link(s)</span>
        </div>
      </div>

      {/* Empty State */}
      {filteredLinks.length === 0 ? (
        <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <BarChart2 className="h-7 w-7 stroke-[2]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            {searchQuery ? 'No matching short links' : 'No short links yet'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No short links match "${searchQuery}". Try a different title, custom slug, or keyword.`
              : 'Create your first intelligent short link to start tracking clicks, smart routes, and real-time edge analytics.'}
          </p>
        </div>
      ) : (
        /* Table Container */
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase font-bold tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Title & Short Link</th>
                  <th scope="col" className="px-6 py-4">Destination URL</th>
                  <th scope="col" className="px-6 py-4 text-center">Total Clicks</th>
                  <th scope="col" className="px-6 py-4">Created</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLinks.map((link) => {
                  const shortUrl = getPublicShortUrl(link);
                  const displaySlug = link.custom_slug || link.short_code;

                  return (
                    <tr key={link.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Title & Short Link */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{link.title}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {displaySlug}
                          </span>
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Open short link"
                          >
                            <ExternalLink className="w-3.5 h-3.5 stroke-[2]" />
                          </a>
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="px-6 py-4 max-w-xs truncate">
                        <a
                          href={link.destination_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-600 hover:text-slate-900 transition-colors underline-offset-2 hover:underline"
                          title={link.destination_url}
                        >
                          {link.destination_url}
                        </a>
                      </td>

                      {/* Total Clicks */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                          <BarChart2 className="w-3.5 h-3.5 text-indigo-600 stroke-[2]" />
                          {link.click_count || 0}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
                          {new Date(link.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy button */}
                          <button
                            onClick={() => handleCopy(link)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
                            onClick={() =>
                              setQrModalState({
                                isOpen: true,
                                url: shortUrl,
                                title: link.title,
                              })
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="View QR Code"
                          >
                            <QrCode className="w-4 h-4 stroke-[2]" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
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
    </div>
  );
}
