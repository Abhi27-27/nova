import type {
  ActivityType,
  InvitationStatus,
  NotificationType,
  ProjectRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '../constants/enums.js';

/**
 * DTO shapes returned by the REST API.
 *
 * Dates are serialized as ISO-8601 strings because that is what crosses the wire.
 * The API builds these through explicit mappers (`apps/api/src/modules/**\/*.mapper.ts`)
 * so persistence columns such as `passwordHash` can never leak into a response.
 */

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface User extends UserSummary {
  jobTitle: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  /** Convenience copy of the workspace the user lands in after signing in. */
  defaultWorkspace: WorkspaceSummary | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: WorkspaceRole;
}

export interface Workspace extends WorkspaceSummary {
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  projectCount: number;
}

export interface WorkspaceMember {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: UserSummary;
}

export interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: UserSummary;
  /** Only returned to the inviter, so the link can be copied and shared manually. */
  token?: string;
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt: string;
  user: UserSummary;
}

export interface ProjectStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  /** 0-100, rounded. */
  progress: number;
  byStatus: Record<TaskStatus, number>;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  members: ProjectMember[];
  stats: ProjectStats;
  /** Role of the requesting user inside this project, when they are a member. */
  viewerRole: ProjectRole | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  color: string;
  status: ProjectStatus;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  workspaceId: string;
  taskCount?: number;
}

export interface Task {
  id: string;
  /** Human friendly identifier, e.g. `NOVA-42`. */
  reference: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  estimateHours: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  assignee: UserSummary | null;
  createdBy: UserSummary;
  labels: Label[];
  commentCount: number;
  isOverdue: boolean;
}

export interface Comment {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  author: UserSummary;
}

export interface Activity {
  id: string;
  type: ActivityType;
  createdAt: string;
  actor: UserSummary;
  /** Denormalised context so the feed renders without extra round-trips. */
  context: {
    projectId: string | null;
    projectName: string | null;
    taskId: string | null;
    taskReference: string | null;
    taskTitle: string | null;
  };
  metadata: Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totals: {
    projects: number;
    activeProjects: number;
    tasks: number;
    completedTasks: number;
    overdueTasks: number;
    members: number;
  };
  /** Percentage of tasks completed across the workspace, 0-100. */
  completionRate: number;
  tasksByStatus: { status: TaskStatus; count: number }[];
  tasksByPriority: { priority: TaskPriority; count: number }[];
  /** Created vs. completed per day for the requested window. */
  throughput: { date: string; created: number; completed: number }[];
  workload: { user: UserSummary; open: number; completed: number; overdue: number }[];
  upcomingDeadlines: Task[];
  recentActivity: Activity[];
}
