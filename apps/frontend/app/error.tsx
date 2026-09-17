'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from '@deemlol/next-icons';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception for diagnostic monitoring
    console.error('Captured client exception:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <AlertTriangle className="h-6 w-6 stroke-[2]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">Temporary Session Refresh Needed</h2>
          <p className="text-xs text-slate-500">
            A temporary sync delay occurred while loading your workspace context.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Application</span>
          </button>
        </div>
      </div>
    </div>
  );
}
