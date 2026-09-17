'use client';

import React, { useState } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Check,
  Zap,
  Shield,
  Layers,
  Sparkles,
} from '@deemlol/next-icons';
import { CustomModal } from '@/components/ui/CustomModal';
import { MorphButton } from '@/components/ui/MorphButton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

interface PixelConfig {
  id: string;
  platform: 'facebook' | 'google' | 'tiktok' | 'linkedin';
  name: string;
  pixel_id: string;
  is_active: boolean;
  created_at: string;
}

export default function PixelsPage() {
  const [pixels, setPixels] = useState<PixelConfig[]>([
    {
      id: 'pxl_meta_01',
      platform: 'facebook',
      name: 'Meta Retargeting Campaign',
      pixel_id: '984712039485123',
      is_active: true,
      created_at: '2026-09-15',
    },
    {
      id: 'pxl_google_01',
      platform: 'google',
      name: 'Google Analytics 4 & Ads Tag',
      pixel_id: 'G-XORU98217',
      is_active: true,
      created_at: '2026-09-16',
    },
    {
      id: 'pxl_tiktok_01',
      platform: 'tiktok',
      name: 'TikTok Video Ads Pixel',
      pixel_id: 'C9812A9B821',
      is_active: false,
      created_at: '2026-09-17',
    },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [platform, setPlatform] = useState<'facebook' | 'google' | 'tiktok' | 'linkedin'>('facebook');
  const [pixelName, setPixelName] = useState('');
  const [pixelIdInput, setPixelIdInput] = useState('');

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    pixelId: string;
    pixelName: string;
  }>({
    isOpen: false,
    pixelId: '',
    pixelName: '',
  });

  const handleCreatePixel = async () => {
    if (!pixelName.trim() || !pixelIdInput.trim()) {
      throw new Error('Name and Pixel ID required');
    }

    const newPixel: PixelConfig = {
      id: `pxl_${Math.random().toString(36).substring(2, 12)}`,
      platform,
      name: pixelName.trim(),
      pixel_id: pixelIdInput.trim(),
      is_active: true,
      created_at: new Date().toISOString().split('T')[0],
    };

    setPixels((prev) => [...prev, newPixel]);
    setIsCreateModalOpen(false);
    setPixelName('');
    setPixelIdInput('');
  };

  const handleDeletePixel = async () => {
    setPixels((prev) => prev.filter((p) => p.id !== deleteModalState.pixelId));
  };

  const togglePixelActive = (id: string) => {
    setPixels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Retargeting Pixels & Ad Tags
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attach marketing pixels to short links to build custom audiences and track conversion ROAS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Add Retargeting Pixel</span>
        </button>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Meta Pixel', count: pixels.filter((p) => p.platform === 'facebook').length, desc: 'Facebook & Instagram' },
          { name: 'Google Ads / GA4', count: pixels.filter((p) => p.platform === 'google').length, desc: 'Google Ads & Analytics' },
          { name: 'TikTok Pixel', count: pixels.filter((p) => p.platform === 'tiktok').length, desc: 'TikTok Ads Manager' },
          { name: 'LinkedIn Insight', count: pixels.filter((p) => p.platform === 'linkedin').length, desc: 'B2B Matched Audiences' },
        ].map((item) => (
          <div key={item.name} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold text-slate-800">{item.name}</span>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Target className="w-3.5 h-3.5 stroke-[2]" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">{item.desc}</p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {item.count} {item.count === 1 ? 'pixel' : 'pixels'} active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pixels Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Configured Pixels</h2>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {pixels.length} total pixels
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Platform & Label</th>
                <th className="px-5 py-3.5">Pixel / Tag ID</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pixels.map((pix) => (
                <tr key={pix.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Platform & Label */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 border border-indigo-100">
                        {pix.platform}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{pix.name}</span>
                    </div>
                  </td>

                  {/* Pixel ID */}
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                    <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200/60">
                      {pix.pixel_id}
                    </span>
                  </td>

                  {/* Status Toggle */}
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => togglePixelActive(pix.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                        pix.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${pix.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{pix.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>

                  {/* Created */}
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{pix.created_at}</td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalState({
                          isOpen: true,
                          pixelId: pix.id,
                          pixelName: pix.name,
                        })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete pixel"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Pixel Modal */}
      <CustomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Retargeting Pixel"
        description="Configure a marketing pixel tag to attach to short links."
      >
        <div className="space-y-4 pt-1">
          {/* Platform Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Ad Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'facebook', label: 'Meta Pixel' },
                { id: 'google', label: 'Google Analytics / Ads' },
                { id: 'tiktok', label: 'TikTok Pixel' },
                { id: 'linkedin', label: 'LinkedIn Insight' },
              ].map((p) => {
                const isSelected = platform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id as any)}
                    className={`rounded-xl border p-2.5 text-xs font-bold text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pixel Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Pixel Label / Name</label>
            <input
              type="text"
              value={pixelName}
              onChange={(e) => setPixelName(e.target.value)}
              placeholder="e.g. Q4 Growth Campaign Pixel"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Pixel ID */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Pixel / Measurement ID</label>
            <input
              type="text"
              value={pixelIdInput}
              onChange={(e) => setPixelIdInput(e.target.value)}
              placeholder="e.g. 984712039485123 or G-XXXXXXXXXX"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <MorphButton onAsyncClick={handleCreatePixel} successText="Pixel Added!">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Pixel</span>
            </MorphButton>
          </div>
        </div>
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleDeletePixel}
        title="Delete Pixel"
        itemName={deleteModalState.pixelName}
        description="Are you sure you want to delete this marketing pixel? Short links referencing this pixel will stop tracking conversions."
      />
    </div>
  );
}

