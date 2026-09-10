/**
 * Domain enumerations.
 *
 * These are the single source of truth for every enumerated value in NOVA and are
 * mirrored 1:1 by the Prisma schema (`apps/api/prisma/schema.prisma`). Keeping them
 * here means the API, the database and the UI can never drift apart.
 */

export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const PROJECT_ROLES = ['LEAD', 'MEMBER', 'VIEWER'] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const ACTIVITY_TYPES = [
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_STATUS_CHANGED',
  'TASK_ASSIGNED',
  'TASK_UNASSIGNED',
  'TASK_PRIORITY_CHANGED',
  'TASK_COMPLETED',
  'TASK_REOPENED',
  'TASK_DELETED',
  'COMMENT_CREATED',
  'COMMENT_DELETED',
  'MEMBER_JOINED',
  'MEMBER_INVITED',
  'MEMBER_ROLE_CHANGED',
  'MEMBER_REMOVED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_DUE_SOON',
  'COMMENT_MENTION',
  'COMMENT_ON_TASK',
  'PROJECT_INVITE',
  'WORKSPACE_INVITE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Ordered board columns — drives the Kanban layout and status pickers. */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

/** Human readable labels, kept next to the values so the UI never invents its own. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  LEAD: 'Lead',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

/**
 * Role hierarchy used by the authorization layer. A role satisfies a requirement
 * when its rank is greater than or equal to the required role's rank.
 */
export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  LEAD: 3,
};
