'use client';

import { WORKSPACE_ROLE_RANK, type Workspace, type WorkspaceRole } from '@nova/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './auth-provider';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  workspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  /** `can('ADMIN')` — true when the viewer's role meets or exceeds the argument. */
  can: (minimum: WorkspaceRole) => boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: queryKeys.workspaces.list(),
    queryFn: () => endpoints.workspaces.list(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const activeId = getActiveWorkspaceId();

  const workspace = useMemo(() => {
    if (workspaces.length === 0) return null;
    return workspaces.find((entry) => entry.id === activeId) ?? workspaces[0] ?? null;
  }, [workspaces, activeId]);

  // Keeps the stored id honest: if the remembered workspace was deleted or the
  // user was removed from it, fall back to one they can actually open.
  useEffect(() => {
    if (workspace && workspace.id !== activeId) setActiveWorkspaceId(workspace.id);
  }, [workspace, activeId]);

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      if (workspaceId === activeId) return;

      setActiveWorkspaceId(workspaceId);

      // Every cached list is scoped to the previous tenant, so the cache is reset
      // rather than merged — showing another workspace's projects for even one
      // frame would be worse than a brief loading state.
      queryClient.removeQueries({ queryKey: queryKeys.projects.all });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.all });
      queryClient.removeQueries({ queryKey: queryKeys.labels.all });
      queryClient.removeQueries({ queryKey: queryKeys.activity.all });
      queryClient.removeQueries({ queryKey: queryKeys.analytics.all });
      queryClient.removeQueries({ queryKey: queryKeys.users.directory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
    [activeId, queryClient],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      workspace,
      isLoading,
      switchWorkspace,
      can: (minimum) =>
        Boolean(workspace) && WORKSPACE_ROLE_RANK[workspace!.role] >= WORKSPACE_ROLE_RANK[minimum],
    }),
    [workspaces, workspace, isLoading, switchWorkspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return context;
}
