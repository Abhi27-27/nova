'use client';

import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';

/**
 * Reference data that several screens need at once — the project list for
 * pickers, the workspace directory for assignees, and the label set.
 *
 * These sit behind a long `staleTime` because they change rarely, so opening a
 * dialog reads from cache instead of firing three requests every time.
 */

const REFERENCE_STALE_TIME = 5 * 60_000;

export function useProjectOptions() {
  return useQuery({
    queryKey: queryKeys.projects.list({ pageSize: 100, options: true }),
    queryFn: () => endpoints.projects.list({ pageSize: 100, sortBy: 'name', sortOrder: 'asc' }),
    staleTime: REFERENCE_STALE_TIME,
    select: (page) => page.items,
  });
}

export function useWorkspaceDirectory() {
  return useQuery({
    queryKey: queryKeys.users.directory(),
    queryFn: () => endpoints.users.directory(),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useLabels() {
  return useQuery({
    queryKey: queryKeys.labels.list(),
    queryFn: () => endpoints.labels.list(),
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: queryKeys.workspaces.members(),
    queryFn: () => endpoints.workspaces.members(),
    staleTime: REFERENCE_STALE_TIME,
  });
}
