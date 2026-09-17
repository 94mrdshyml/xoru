'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  GitBranch,
  Smartphone,
  Globe,
  Sliders,
  Plus,
  Trash2,
  Check,
  Zap,
  ArrowRight,
  Shield,
  Layers,
} from '@deemlol/next-icons';
import { ShortLink } from '@/components/LinksTable';
import { CustomModal } from '@/components/ui/CustomModal';
import { MorphButton } from '@/components/ui/MorphButton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

interface SmartRouteRule {
  id: string;
  link_id: string;
  rule_type: 'device' | 'geo' | 'ab_test';
  condition: string;
  target_url: string;
  priority: number;
  is_active: boolean;
}

export default function SmartRoutesPage() {
  const { getToken } = useAuth();
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [routes, setRoutes] = useState<SmartRouteRule[]>([
    {
      id: 'srt_ios_app_store',
      link_id: 'sample',
      rule_type: 'device',
      condition: 'iOS (iPhone / iPad)',
      target_url: 'https://apps.apple.com/app/xoru',
      priority: 1,
      is_active: true,
    },
    {
      id: 'srt_android_play',
      link_id: 'sample',
      rule_type: 'device',
      condition: 'Android Mobile',
      target_url: 'https://play.google.com/store/apps/details?id=com.xoru',
      priority: 2,
      is_active: true,
    },
    {
      id: 'srt_geo_eu',
      link_id: 'sample',
      rule_type: 'geo',
      condition: 'Country ISO: DE, FR, IT (EU)',
      target_url: 'https://xoru.com/eu/pricing',
      priority: 3,
      is_active: true,
    },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [ruleType, setRuleType] = useState<'device' | 'geo' | 'ab_test'>('device');
  const [conditionValue, setConditionValue] = useState('iOS');
  const [targetUrl, setTargetUrl] = useState('');
  const [targetLink, setTargetLink] = useState('');

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    ruleId: string;
    condition: string;
  }>({
    isOpen: false,
    ruleId: '',
    condition: '',
  });

  const fetchLinks = useCallback(async () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/links`, { headers });
      if (res.ok) {
        const data = await res.json();
        const linkList = Array.isArray(data) ? data : [];
        setLinks(linkList);
        if (linkList.length > 0) {
          setSelectedLinkId(linkList[0].id);
          setTargetLink(linkList[0].id);
        }
      }
    } catch {
      // Fallback
    }
  }, [getToken]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateRule = async () => {
    if (!targetUrl.trim()) throw new Error('Target URL required');
    try {
      new URL(targetUrl);
    } catch {
      throw new Error('Valid URL required');
    }

    const newRule: SmartRouteRule = {
      id: `srt_${Math.random().toString(36).substring(2, 12)}`,
      link_id: targetLink || (links[0]?.id ?? 'default'),
      rule_type: ruleType,
      condition: conditionValue,
      target_url: targetUrl.trim(),
      priority: routes.length + 1,
      is_active: true,
    };

    setRoutes((prev) => [...prev, newRule]);
    setIsCreateModalOpen(false);
    setTargetUrl('');
  };

  const handleDeleteRule = async () => {
    setRoutes((prev) => prev.filter((r) => r.id !== deleteModalState.ruleId));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Smart Dynamic Routing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate visitor context at the edge and route dynamically before sending 301/302 redirects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>+ Add Smart Rule</span>
        </button>
      </div>

      {/* 3 Core Routing Capability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Routing Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <Smartphone className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Device Targeting</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Detect iOS, Android, macOS, or Windows user-agents at Cloudflare edge and deep-link directly to native app stores.
          </p>
        </div>

        {/* Geo Routing Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <Globe className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Geo Country Routing</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Inspect incoming visitor CF-IPCountry headers to route international users to localized landing pages or pricing.
          </p>
        </div>

        {/* A/B Traffic Split */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <Sliders className="w-4 h-4 stroke-[2]" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">A/B Traffic Split</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Distribute traffic across multiple landing pages with deterministic hash percentages to measure real conversion lifts.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Configured Edge Rules</h2>
          <span className="text-xs font-semibold text-slate-400 tabular-nums">
            {routes.length} active rules
          </span>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Priority & Type</th>
                <th className="px-5 py-3.5">Match Condition</th>
                <th className="px-5 py-3.5">Target Destination URL</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((rule, idx) => (
                <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Priority & Type */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 border border-indigo-100">
                        {rule.rule_type === 'device' && <Smartphone className="w-3 h-3" />}
                        {rule.rule_type === 'geo' && <Globe className="w-3 h-3" />}
                        {rule.rule_type === 'ab_test' && <Sliders className="w-3 h-3" />}
                        <span>{rule.rule_type}</span>
                      </span>
                    </div>
                  </td>

                  {/* Match Condition */}
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    <span className="font-mono text-xs">{rule.condition}</span>
                  </td>

                  {/* Target URL */}
                  <td className="px-5 py-3.5 max-w-xs truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                      <a
                        href={rule.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline truncate"
                      >
                        {rule.target_url}
                      </a>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Active</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalState({
                          isOpen: true,
                          ruleId: rule.id,
                          condition: rule.condition,
                        })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete rule"
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

      {/* Add Smart Route Modal */}
      <CustomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Smart Dynamic Route"
        description="Define edge routing logic to redirect visitors dynamically based on client context."
      >
        <div className="space-y-4 pt-1">
          {/* Target Short Link */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Apply Rule to Short Link</label>
            <select
              value={targetLink}
              onChange={(e) => setTargetLink(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {links.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.title} (/{link.custom_slug || link.short_code})
                </option>
              ))}
            </select>
          </div>

          {/* Rule Type Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Routing Rule Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'device', label: 'Device OS', icon: Smartphone },
                { type: 'geo', label: 'Country Geo', icon: Globe },
                { type: 'ab_test', label: 'A/B Split', icon: Sliders },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = ruleType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setRuleType(item.type as 'device' | 'geo' | 'ab_test');
                      if (item.type === 'device') setConditionValue('iOS (iPhone/iPad)');
                      if (item.type === 'geo') setConditionValue('Country ISO: US');
                      if (item.type === 'ab_test') setConditionValue('Traffic Split: 50%');
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Match Condition</label>
            <input
              type="text"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              placeholder="e.g. iOS, Android, Country: US, or Split: 50%"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Destination URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Target Redirect URL</label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/your-app"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <MorphButton onAsyncClick={handleCreateRule} successText="Rule Added!">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Smart Rule</span>
            </MorphButton>
          </div>
        </div>
      </CustomModal>

      {/* Delete Rule Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleDeleteRule}
        title="Delete Smart Rule"
        itemName={deleteModalState.condition}
        description="Are you sure you want to delete this dynamic route? Traffic matching this condition will fall back to the primary link destination."
      />
    </div>
  );
}

