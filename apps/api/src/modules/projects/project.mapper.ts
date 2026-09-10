import {
  TASK_STATUS_ORDER,
  toPercentage,
  type Project,
  type ProjectMember,
  type ProjectRole,
  type ProjectStats,
  type ProjectSummary,
  type TaskStatus,
} from '@nova/shared';
import { Prisma } from '@prisma/client';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';

export const projectMemberInclude = {
  user: { select: userSummarySelect },
} satisfies Prisma.ProjectMemberInclude;

export const projectInclude = {
  createdBy: { select: userSummarySelect },
  members: { include: projectMemberInclude, orderBy: { joinedAt: 'asc' } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
type ProjectMemberRow = Prisma.ProjectMemberGetPayload<{ include: typeof projectMemberInclude }>;

export function toProjectMember(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    user: toUserSummary(row.user),
  };
}

export function emptyStats(): ProjectStats {
  return {
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    progress: 0,
    byStatus: Object.fromEntries(TASK_STATUS_ORDER.map((status) => [status, 0])) as Record<
      TaskStatus,
      number
    >,
  };
}

/**
 * Builds the per-project rollup from a `groupBy` result rather than by loading
 * tasks, so the projects list stays a fixed number of queries regardless of size.
 */
export function buildStats(
  statusCounts: { status: TaskStatus; count: number }[],
  overdue: number,
): ProjectStats {
  const stats = emptyStats();

  for (const entry of statusCounts) {
    stats.byStatus[entry.status] = entry.count;
    stats.total += entry.count;
  }

  stats.completed = stats.byStatus.DONE;
  stats.inProgress = stats.byStatus.IN_PROGRESS + stats.byStatus.IN_REVIEW;
  stats.overdue = overdue;
  stats.progress = toPercentage(stats.completed, stats.total);

  return stats;
}

export function toProjectSummary(
  row: Pick<ProjectRow, 'id' | 'name' | 'key' | 'color' | 'status'>,
): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    color: row.color,
    status: row.status,
  };
}

export function toProject(row: ProjectRow, stats: ProjectStats, viewerId: string | null): Project {
  const viewerRole: ProjectRole | null =
    (viewerId ? row.members.find((member) => member.userId === viewerId)?.role : null) ?? null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    key: row.key,
    description: row.description,
    status: row.status,
    color: row.color,
    startDate: row.startDate?.toISOString() ?? null,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: toUserSummary(row.createdBy),
    members: row.members.map(toProjectMember),
    stats,
    viewerRole,
  };
}
