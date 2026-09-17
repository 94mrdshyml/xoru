'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back to <span className="text-indigo-600">Xoru</span>
          </h1>
          <p className="text-sm text-slate-500">
            Short Link. Real Intelligence.
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary:
                  'bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm active:scale-[0.98]',
                card: 'rounded-2xl border border-slate-200 shadow-xl bg-white p-6',
                headerTitle: 'text-xl font-bold text-slate-900',
                headerSubtitle: 'text-sm text-slate-500',
                socialButtonsBlockButton:
                  'rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors',
                formFieldInput:
                  'rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm',
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
