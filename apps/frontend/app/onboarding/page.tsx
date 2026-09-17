'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link2, Loader2, CheckCircle2 } from 'lucide-react';

export const runtime = 'edge';

export default function OnboardingPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isLoaded: isAuthLoaded } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isUserLoaded || !isAuthLoaded) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    let isMounted = true;

    async function runOnboarding() {
      try {
        const firstName = user?.firstName || 'User';
        const lastName = user?.lastName || '';
        const email = user?.emailAddresses[0]?.emailAddress || '';

        const res = await fetch('/api/auth/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to provision workspace.');
        }

        if (isMounted) {
          setStatus('success');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
        }
      } catch (err: any) {
        console.error('Onboarding error:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMsg(err.message || 'Something went wrong during workspace setup.');
        }
      }
    }

    runOnboarding();

    return () => {
      isMounted = false;
    };
  }, [isUserLoaded, isAuthLoaded, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <Link2 className="h-6 w-6 stroke-[2.5]" />
          </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="font-semibold text-slate-900">Setting up your workspace...</span>
            </div>
            <p className="text-xs text-slate-500">
              Provisioning Multi-Tenant Isolation & Neon DB Row-Level Security
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
              <span className="text-lg font-bold text-slate-900">Workspace Ready!</span>
            </div>
            <p className="text-sm text-slate-500">
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-rose-600">{errorMsg}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

