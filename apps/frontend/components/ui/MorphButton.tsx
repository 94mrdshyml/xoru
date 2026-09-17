'use client';

import React, { useState } from 'react';
import { Loader as Loader2, Check } from '@deemlol/next-icons';

export type ButtonState = 'idle' | 'loading' | 'success';

interface MorphButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onAsyncClick?: () => Promise<void>;
  successText?: string;
  variant?: 'primary' | 'destructive';
}

export function MorphButton({
  children,
  onAsyncClick,
  successText = 'Done!',
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: MorphButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state !== 'idle' || disabled) return;

    if (onAsyncClick) {
      try {
        setState('loading');
        await onAsyncClick();
        setState('success');
        setTimeout(() => {
          setState('idle');
        }, 1500);
      } catch (err) {
        setState('idle');
      }
    } else if (props.onClick) {
      props.onClick(e);
    }
  };

  const isPrimary = variant === 'primary';
  const bgClasses = state === 'success'
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
    : isPrimary
    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm';

  return (
    <button
      {...props}
      disabled={disabled || state === 'loading'}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${bgClasses} ${className}`}
    >
      {/* IDLE STATE CONTENT */}
      <span
        className={`inline-flex items-center gap-2 transition-all duration-200 ${
          state === 'idle' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'
        }`}
      >
        {children}
      </span>

      {/* LOADING STATE CONTENT */}
      <span
        className={`inline-flex items-center gap-2 transition-all duration-200 ${
          state === 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'
        }`}
      >
        <Loader2 className="w-4 h-4 animate-spin stroke-[2]" />
        <span>Processing...</span>
      </span>

      {/* SUCCESS STATE CONTENT */}
      <span
        className={`inline-flex items-center gap-2 transition-all duration-200 ${
          state === 'success' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'
        }`}
      >
        <Check className="w-4 h-4 stroke-[2.5] animate-in zoom-in-50 duration-200" />
        <span>{successText}</span>
      </span>
    </button>
  );
}

