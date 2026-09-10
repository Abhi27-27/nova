import type {
  Activity,
  ActivityQuery,
  AuthSession,
  Comment,
  CreateCommentInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateTaskInput,
  CreateWorkspaceInput,
  DashboardQuery,
  DashboardSummary,
  Invitation,
  InviteMemberInput,
  Label,
  ListProjectsQuery,
  ListTasksQuery,
  MoveTaskInput,
  Notification,
  Paginated,
  PaginationInput,
  Project,
  ProjectMember,
  ProjectRole,
  Task,
  TaskStatus,
  UpdateProfileInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  User,
  UserSummary,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from '@nova/shared';
import { api } from './api-client';

/**
 * Typed bindings for every endpoint.
 *
 * Request and response types come from `@nova/shared`, which is the same module
 * the server validates against — so a change to the API contract surfaces here as
 * a compile error rather than as a runtime surprise.
 */

export interface SessionResponse extends AuthSession {
  accessToken?: string;
}

export interface BoardColumn {
  status: TaskStatus;
  label: string;
  tasks: Task[];
}

export interface BoardResponse {
  projectId: string;
  columns: BoardColumn[];
  total: number;
}

export interface NotificationsResponse extends Paginated<Notification> {
  unreadCount: number;
}

export interface InvitationPreview {
  email: string;
  role: WorkspaceRole;
  workspace: { id: string; name: string; slug: string };
  invitedBy: UserSummary;
  expiresAt: string;
}

export type InviteResult =
  | { kind: 'member'; member: WorkspaceMember }
  | { kind: 'invitation'; invitation: Invitation; inviteUrl: string };

/** `Record<string, unknown>` shaped so query objects can be spread into requests. */
type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export const endpoints = {
  auth: {
    register: (body: {
      name: string;
      email: string;
      password: string;
      workspaceName?: string;
      invitationToken?: string;
    }) => api.post<SessionResponse>('/auth/register', body, { skipRefresh: true }),

    login: (body: { email: string; password: string }) =>
      api.post<SessionResponse>('/auth/login', body, { skipRefresh: true }),

    logout: () =>
      api.post<{ signedOut: boolean }>('/auth/logout', undefined, { skipRefresh: true }),

    session: () => api.get<AuthSession>('/auth/session', { skipRefresh: true }),

    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      api.patch<SessionResponse>('/auth/password', body),

    previewInvitation: (token: string) =>
      api.get<InvitationPreview>(`/auth/invitations/${encodeURIComponent(token)}`, {
        skipRefresh: true,
      }),

    acceptInvitation: (token: string) =>
      api.post<WorkspaceSummary>('/auth/invitations/accept', { token }),
  },

  users: {
    me: () => api.get<User>('/users/me'),
    updateMe: (body: UpdateProfileInput) => api.patch<User>('/users/me', body),
    directory: () => api.get<UserSummary[]>('/users'),
  },

  workspaces: {
    list: () => api.get<Workspace[]>('/workspaces'),
    create: (body: CreateWorkspaceInput) => api.post<Workspace>('/workspaces', body),
    current: () => api.get<Workspace>('/workspaces/current'),
    update: (body: UpdateWorkspaceInput) => api.patch<Workspace>('/workspaces/current', body),
    remove: () => api.delete<void>('/workspaces/current'),

    members: () => api.get<WorkspaceMember[]>('/workspaces/current/members'),
    invite: (body: InviteMemberInput) =>
      api.post<InviteResult>('/workspaces/current/members', body),
    updateMemberRole: (memberId: string, role: WorkspaceRole) =>
      api.patch<WorkspaceMember>(`/workspaces/current/members/${memberId}`, { role }),
    removeMember: (memberId: string) => api.delete<void>(`/workspaces/current/members/${memberId}`),
    transferOwnership: (memberId: string) =>
      api.post<WorkspaceMember[]>(`/workspaces/current/members/${memberId}/transfer-ownership`),

    invitations: () => api.get<Invitation[]>('/workspaces/current/invitations'),
    revokeInvitation: (invitationId: string) =>
      api.delete<void>(`/workspaces/current/invitations/${invitationId}`),
  },

  projects: {
    list: (query: Partial<ListProjectsQuery> = {}) =>
      api.get<Paginated<Project>>('/projects', { query: query as Query }),
    get: (projectId: string) => api.get<Project>(`/projects/${projectId}`),
    create: (body: Partial<CreateProjectInput>) => api.post<Project>('/projects', body),
    update: (projectId: string, body: UpdateProjectInput) =>
      api.patch<Project>(`/projects/${projectId}`, body),
    remove: (projectId: string) => api.delete<void>(`/projects/${projectId}`),

    members: (projectId: string) => api.get<ProjectMember[]>(`/projects/${projectId}/members`),
    addMember: (projectId: string, userId: string, role: ProjectRole = 'MEMBER') =>
      api.post<ProjectMember>(`/projects/${projectId}/members`, { userId, role }),
    updateMember: (projectId: string, memberId: string, role: ProjectRole) =>
      api.patch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role }),
    removeMember: (projectId: string, memberId: string) =>
      api.delete<void>(`/projects/${projectId}/members/${memberId}`),
  },

  tasks: {
    list: (query: Partial<ListTasksQuery> = {}) =>
      api.get<Paginated<Task>>('/tasks', { query: query as Query }),
    board: (query: { projectId: string } & Record<string, unknown>) =>
      api.get<BoardResponse>('/tasks/board', { query: query as Query }),
    get: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),
    create: (body: Partial<CreateTaskInput>) => api.post<Task>('/tasks', body),
    update: (taskId: string, body: UpdateTaskInput) => api.patch<Task>(`/tasks/${taskId}`, body),
    move: (taskId: string, body: MoveTaskInput) => api.post<Task>(`/tasks/${taskId}/move`, body),
    remove: (taskId: string) => api.delete<void>(`/tasks/${taskId}`),
  },

  comments: {
    list: (taskId: string, query: Partial<PaginationInput> = {}) =>
      api.get<Paginated<Comment>>(`/tasks/${taskId}/comments`, { query: query as Query }),
    create: (taskId: string, body: CreateCommentInput) =>
      api.post<Comment>(`/tasks/${taskId}/comments`, body),
    update: (commentId: string, body: CreateCommentInput) =>
      api.patch<Comment>(`/comments/${commentId}`, body),
    remove: (commentId: string) => api.delete<void>(`/comments/${commentId}`),
  },

  labels: {
    list: () => api.get<Label[]>('/labels'),
    create: (body: CreateLabelInput) => api.post<Label>('/labels', body),
    update: (labelId: string, body: Partial<CreateLabelInput>) =>
      api.patch<Label>(`/labels/${labelId}`, body),
    remove: (labelId: string) => api.delete<void>(`/labels/${labelId}`),
  },

  activity: {
    list: (query: Partial<ActivityQuery> = {}) =>
      api.get<Paginated<Activity>>('/activity', { query: query as Query }),
  },

  notifications: {
    list: (query: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) =>
      api.get<NotificationsResponse>('/notifications', { query: query as Query }),
    markRead: (notificationId: string) =>
      api.post<{ id: string; read: boolean }>(`/notifications/${notificationId}/read`),
    markAllRead: () => api.post<{ updated: number }>('/notifications/read-all'),
  },

  analytics: {
    dashboard: (query: Partial<DashboardQuery> = {}) =>
      api.get<DashboardSummary>('/analytics/dashboard', { query: query as Query }),
  },
};
