import type { Metadata } from 'next';
import { Open_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Xoru — Short Link. Real Intelligence.',
  description: 'High-performance multi-tenant link shortening and dynamic routing platform.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    'pk_test_c3dlZXBpbmctbW9jY2FzaW4tNzIxNi5jbGVyay5hY2NvdW50cy5kZXYk';

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: '#4F46E5',
          colorText: '#0F172A',
          colorBackground: '#FFFFFF',
          colorInputBackground: '#FFFFFF',
          colorInputText: '#0F172A',
          borderRadius: '0.75rem',
          fontFamily: 'var(--font-open-sans), sans-serif',
        },
        elements: {
          card: 'rounded-2xl border border-slate-200/90 shadow-xl bg-white p-6 font-sans',
          headerTitle: 'text-slate-900 font-bold',
          headerSubtitle: 'text-slate-500 text-xs font-medium',
          formButtonPrimary:
            'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl py-2.5 transition-all shadow-sm active:scale-[0.98]',
          userButtonPopoverCard: 'rounded-2xl border border-slate-200 shadow-xl p-2 font-sans bg-white',
          userButtonPopoverFooter: 'hidden',
          organizationSwitcherPopoverCard: 'rounded-2xl border border-slate-200 shadow-xl p-2 font-sans bg-white',
          organizationSwitcherPopoverFooter: 'hidden',
          footer: 'hidden',
          footerAction: 'hidden',
        },
      }}
    >
      <html lang="en" className={`${openSans.variable} font-sans antialiased`}>
        <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

