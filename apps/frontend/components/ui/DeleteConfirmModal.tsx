'use client';

import React from 'react';
import { CustomModal } from './CustomModal';
import { MorphButton } from './MorphButton';
import { AlertTriangle, Trash2 } from '@deemlol/next-icons';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  itemName?: string;
  description?: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Short Link',
  itemName,
  description = 'Are you sure you want to permanently delete this item? This action cannot be undone and the short link will stop redirecting immediately.',
}: DeleteConfirmModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5 stroke-[2]" />
          </div>
          <div className="space-y-1 text-xs">
            {itemName && (
              <p className="font-bold text-rose-950">
                Target: <span className="font-mono text-rose-800">{itemName}</span>
              </p>
            )}
            <p className="text-rose-700 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <MorphButton
            variant="destructive"
            onAsyncClick={async () => {
              await onConfirm();
              onClose();
            }}
            successText="Deleted!"
            className="text-xs px-4 py-2.5 bg-rose-600 hover:bg-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
            <span>Delete Permanently</span>
          </MorphButton>
        </div>
      </div>
    </CustomModal>
  );
}

