'use client';

import React, { useEffect } from 'react';
import { X } from '@deemlol/next-icons';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function CustomModal({
  isOpen,
  onClose,
  title,
  description,
  children
}: CustomModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal Card Surface */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-indigo-950/10 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}

