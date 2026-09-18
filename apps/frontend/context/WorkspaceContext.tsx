'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  isLoading: boolean;
  setActiveWorkspaceId: (workspaceId: string) => void;
  createWorkspace: (name: string, logoUrl?: string) => Promise<Workspace | null>;
  updateWorkspace: (id: string, name: string, logoUrl?: string | null) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
  getWorkspaceLogo: (workspace?: Workspace | null) => string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/**
 * Generate a deterministic, consistent Dicebear geometric SVG logo for workspaces
 */
export function getDicebearWorkspaceLogo(workspace?: Workspace | null): string {
  if (workspace?.logo_url && workspace.logo_url.trim().startsWith('http')) {
    return workspace.logo_url.trim();
  }
  const seed = encodeURIComponent(workspace?.id || workspace?.name || 'xoru-workspace');
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=e0e7ff,c7d2fe,ede9fe`;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/workspaces`, { headers });
      if (res.ok) {
        const data: Workspace[] = await res.json();
        const list = Array.isArray(data) ? data : [];
        setWorkspaces(list);

        // Resolve active workspace from localStorage or first item
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('xoru_active_workspace') : null;
        const matchingSaved = list.find((w) => w.id === savedId);

        if (matchingSaved) {
          setActiveWorkspaceIdState(matchingSaved.id);
        } else if (list.length > 0) {
          setActiveWorkspaceIdState(list[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('xoru_active_workspace', list[0].id);
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      fetchWorkspaces();
    }
  }, [isAuthLoaded, isSignedIn, fetchWorkspaces]);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xoru_active_workspace', id);
      window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: id }));
    }
  };

  const createWorkspace = async (name: string, logoUrl?: string): Promise<Workspace | null> => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/workspaces`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim(), logo_url: logoUrl || undefined }),
      });

      if (res.ok) {
        const created: Workspace = await res.json();
        setWorkspaces((prev) => [...prev, created]);
        setActiveWorkspaceId(created.id);
        return created;
      }
    } catch {
      // Error
    }
    return null;
  };

  const updateWorkspace = async (
    id: string,
    name: string,
    logoUrl?: string | null
  ): Promise<Workspace | null> => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/workspaces/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: name.trim(), logo_url: logoUrl }),
      });

      if (res.ok) {
        const updated: Workspace = await res.json();
        setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspaceChanged', { detail: id }));
        }
        return updated;
      }
    } catch {
      // Error
    }
    return null;
  };

  const deleteWorkspace = async (id: string): Promise<boolean> => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://xoru-backend.mridu.workers.dev';
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/workspaces/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        const json = await res.json();
        const remaining: Workspace[] = json.remaining_workspaces || [];
        setWorkspaces(remaining);
        if (remaining.length > 0) {
          const nextActive = remaining.find((w) => w.id !== id) || remaining[0];
          setActiveWorkspaceId(nextActive.id);
        }
        return true;
      }
    } catch {
      // Error
    }
    return false;
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeWorkspaceId,
        isLoading,
        setActiveWorkspaceId,
        createWorkspace,
        updateWorkspace,
        deleteWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        getWorkspaceLogo: getDicebearWorkspaceLogo,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

