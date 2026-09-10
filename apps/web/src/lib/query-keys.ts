/**
 * Query key factory.
 *
 * Keys are hierarchical, so a mutation can invalidate exactly the right slice:
 * `queryKeys.tasks.all` drops every task query, while `queryKeys.tasks.board(id)`
 * drops only one board. Building them here — rather than inline at each call —
 * is what keeps invalidation correct as the app grows.
 */
export const queryKeys = {
  session: ['session'] as const,

  workspaces: {
    all: ['workspaces'] as const,
    list: () => [...queryKeys.workspaces.all, 'list'] as const,
    current: () => [...queryKeys.workspaces.all, 'current'] as const,
    members: () => [...queryKeys.workspaces.all, 'members'] as const,
    invitations: () => [...queryKeys.workspaces.all, 'invitations'] as const,
  },

  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    directory: () => [...queryKeys.users.all, 'directory'] as const,
  },

  projects: {
    all: ['projects'] as const,
    list: (filters?: unknown) => [...queryKeys.projects.all, 'list', filters ?? {}] as const,
    detail: (projectId: string) => [...queryKeys.projects.all, 'detail', projectId] as const,
    members: (projectId: string) => [...queryKeys.projects.all, 'members', projectId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    list: (filters?: unknown) => [...queryKeys.tasks.all, 'list', filters ?? {}] as const,
    board: (projectId: string, filters?: unknown) =>
      [...queryKeys.tasks.all, 'board', projectId, filters ?? {}] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, 'detail', taskId] as const,
  },

  comments: {
    all: ['comments'] as const,
    list: (taskId: string) => [...queryKeys.comments.all, taskId] as const,
  },

  labels: {
    all: ['labels'] as const,
    list: () => [...queryKeys.labels.all, 'list'] as const,
  },

  activity: {
    all: ['activity'] as const,
    list: (filters?: unknown) => [...queryKeys.activity.all, 'list', filters ?? {}] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    list: (filters?: unknown) => [...queryKeys.notifications.all, 'list', filters ?? {}] as const,
  },

  analytics: {
    all: ['analytics'] as const,
    dashboard: (filters?: unknown) =>
      [...queryKeys.analytics.all, 'dashboard', filters ?? {}] as const,
  },
};
