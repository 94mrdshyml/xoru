'use client';

import React, { useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import {
  Key,
  Plus,
  Trash2,
  Check,
  Copy,
  Shield,
  Layers,
  Zap,
  Globe,
  Database,
  Lock,
} from '@deemlol/next-icons';
import { CustomModal } from '@/components/ui/CustomModal';
import { MorphButton } from '@/components/ui/MorphButton';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { useWorkspace } from '@/context/WorkspaceContext';

interface ApiKey {
  id: string;
  name: string;
  token_preview: string;
  full_token?: string;
  created_at: string;
  last_used: string;
}

export default function SettingsPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const { activeWorkspace, getWorkspaceLogo } = useWorkspace();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: 'key_live_default_01',
      name: 'Production Worker Key',
      token_preview: 'key_live_9f8e••••••••7d6c',
      created_at: '2026-09-15',
      last_used: '2 mins ago',
    },
  ]);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    keyId: string;
    keyName: string;
  }>({
    isOpen: false,
    keyId: '',
    keyName: '',
  });

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) throw new Error('Key name is required');

    const randomSuffix = Array.from({ length: 24 }, () =>
      Math.random().toString(36)[2]
    ).join('');
    const rawToken = `key_live_${randomSuffix}`;

    const newKeyItem: ApiKey = {
      id: `key_${randomSuffix.substring(0, 10)}`,
      name: newKeyName.trim(),
      token_preview: `key_live_${randomSuffix.substring(0, 4)}••••••••${randomSuffix.slice(-4)}`,
      full_token: rawToken,
      created_at: new Date().toISOString().split('T')[0],
      last_used: 'Never',
    };

    setApiKeys((prev) => [...prev, newKeyItem]);
    setGeneratedKey(rawToken);
    setNewKeyName('');
  };

  const handleCopyGeneratedKey = async () => {
    if (generatedKey) {
      await navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleRevokeKey = async () => {
    setApiKeys((prev) => prev.filter((k) => k.id !== deleteModalState.keyId));
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGeneratedKey(null);
    setCopiedKey(false);
    setNewKeyName('');
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Developer Settings & API Access
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage developer API keys, workspace environment parameters, and edge infrastructure telemetry.
        </p>
      </div>

      {/* Section 1: Developer API Keys */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Developer API Keys</h2>
            <p className="text-xs text-slate-500">
              Use API keys to programmatically create short links, query analytics, and configure dynamic routes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Generate New API Key</span>
          </button>
        </div>

        {/* API Keys Table */}
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase font-bold tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Key Name</th>
                <th className="px-5 py-3.5">Token Prefix / Preview</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5">Last Used</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{k.name}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700">
                    <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200/60">
                      {k.token_preview}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{k.created_at}</td>
                  <td className="px-5 py-3.5 text-slate-500">{k.last_used}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteModalState({
                          isOpen: true,
                          keyId: k.id,
                          keyName: k.name,
                        })
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Revoke key"
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

      {/* Section 2: Workspace & Tenant Context */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Workspace Environment</h2>
          <p className="text-xs text-slate-500">
            Current multi-tenant isolation parameters mapped to your authenticated Clerk identity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Workspace Profile</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Workspace</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                  <img
                    src={getWorkspaceLogo(activeWorkspace)}
                    alt={activeWorkspace?.name || 'Workspace'}
                    className="w-4 h-4 rounded object-contain border border-slate-200/80"
                  />
                  {activeWorkspace?.name || 'Workspace'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Workspace ID</span>
                <span className="font-mono text-slate-700 text-[11px]">{activeWorkspace?.id || 'wrk_default'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Workspace Owner</span>
                <span className="font-semibold text-slate-800">
                  {user?.fullName || user?.firstName || 'Personal'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">RLS Multi-Tenancy</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <Shield className="w-3 h-3 stroke-[2.5]" /> Enforced
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Edge & Infrastructure Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Edge Infrastructure Health</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Cloudflare Workers</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live (v8 Engine)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Global Edge KV</span>
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Sub-10ms Cache
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Neon Postgres DB</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Database className="w-3 h-3 text-indigo-600" /> Serverless Pool
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate API Key Modal */}
      <CustomModal
        isOpen={isGenerateModalOpen}
        onClose={closeGenerateModal}
        title="Generate Developer API Key"
        description="Create a secure, scoped API token for server-to-server link automation."
      >
        <div className="space-y-4 pt-1">
          {generatedKey ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1 text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>API Key Generated Successfully</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Make sure to copy your API key now. You won&apos;t be able to see it again!
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
                <span className="font-mono text-xs font-bold text-slate-900 truncate flex-1">
                  {generatedKey}
                </span>
                <button
                  type="button"
                  onClick={handleCopyGeneratedKey}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Key Description / Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. CI/CD Link Publisher"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={closeGenerateModal}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <MorphButton onAsyncClick={handleGenerateKey} successText="Generated!">
                  <Key className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Generate Key</span>
                </MorphButton>
              </div>
            </div>
          )}
        </div>
      </CustomModal>

      {/* Revoke API Key Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ ...deleteModalState, isOpen: false })}
        onConfirm={handleRevokeKey}
        title="Revoke Developer API Key"
        itemName={deleteModalState.keyName}
        description="Are you sure you want to revoke this API key? Any automated services, scripts, or Workers using this token will immediately lose access."
      />
    </div>
  );
}

