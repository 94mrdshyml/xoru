'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { CreateLinkModal } from '@/components/CreateLinkModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, orgId, userId } = useAuth();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 antialiased">
      {/* Light Theme SaaS Sidebar */}
      <Sidebar
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(wrkId) => {
          setActiveWorkspaceId(wrkId);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: wrkId }));
          }
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-60 min-h-screen">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Global Create Short Link Modal */}
      <CreateLinkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLinkCreated={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('linkCreated'));
          }
        }}
        workspaceId={activeWorkspaceId}
      />
    </div>
  );
}
