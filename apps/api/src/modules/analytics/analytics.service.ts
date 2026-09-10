import {
  TASK_PRIORITIES,
  TASK_STATUS_ORDER,
  toPercentage,
  type DashboardQuery,
  type DashboardSummary,
  type TaskPriority,
  type TaskStatus,
} from '@nova/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { WorkspaceContext } from '../../types/express.js';
import { activityInclude, toActivity } from '../activity/activity.mapper.js';
import { assertProjectAccess } from '../projects/project.access.js';
import { taskInclude, toTask } from '../tasks/task.mapper.js';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';

interface ThroughputRow {
  day: Date;
  created: bigint;
  completed: bigint;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Created-vs-completed per day.
 *
 * Done in SQL rather than by loading tasks into memory: the window can be 180 days
 * across thousands of tasks, and grouping in the database keeps the payload to one
 * row per day regardless of volume. The gaps are filled in afterwards so the chart
 * always has a continuous x-axis, including days with no activity at all.
 */
async function loadThroughput(
  workspaceId: string,
  projectId: string | undefined,
  days: number,
): Promise<DashboardSummary['throughput']> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const projectFilter = projectId ? Prisma.sql`AND p."id" = ${projectId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<ThroughputRow[]>`
    SELECT
      day::date AS day,
      COUNT(*) FILTER (WHERE kind = 'created')   AS created,
      COUNT(*) FILTER (WHERE kind = 'completed') AS completed
    FROM (
      SELECT date_trunc('day', t."createdAt") AS day, 'created' AS kind
      FROM tasks t
      JOIN projects p ON p."id" = t."projectId"
      WHERE p."workspaceId" = ${workspaceId} ${projectFilter}
        AND t."createdAt" >= ${since}
      UNION ALL
      SELECT date_trunc('day', t."completedAt") AS day, 'completed' AS kind
      FROM tasks t
      JOIN projects p ON p."id" = t."projectId"
      WHERE p."workspaceId" = ${workspaceId} ${projectFilter}
        AND t."completedAt" IS NOT NULL
        AND t."completedAt" >= ${since}
    ) events
    GROUP BY day
    ORDER BY day ASC
  `;

  const byDay = new Map(
    rows.map((row) => [
      isoDay(row.day),
      { created: Number(row.created), completed: Number(row.completed) },
    ]),
  );

  const series: DashboardSummary['throughput'] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const cursor = new Date(since);
    cursor.setUTCDate(cursor.getUTCDate() + offset);
    const key = isoDay(cursor);
    const entry = byDay.get(key);
    series.push({ date: key, created: entry?.created ?? 0, completed: entry?.completed ?? 0 });
  }

  return series;
}

/** Open / completed / overdue counts per assignee, for the team workload chart. */
async function loadWorkload(
  workspaceId: string,
  projectFilter: Prisma.TaskWhereInput,
): Promise<DashboardSummary['workload']> {
  const [open, completed, overdue, members] = await Promise.all([
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...projectFilter, assigneeId: { not: null }, status: { not: 'DONE' } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { ...projectFilter, assigneeId: { not: null }, status: 'DONE' },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        ...projectFilter,
        assigneeId: { not: null },
        status: { not: 'DONE' },
        dueDate: { lt: new Date() },
      },
      _count: { _all: true },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: userSummarySelect } },
      orderBy: { joinedAt: 'asc' },
    }),
  ]);

  const asMap = (rows: { assigneeId: string | null; _count: { _all: number } }[]) =>
    new Map(
      rows
        .filter((row) => row.assigneeId)
        .map((row) => [row.assigneeId as string, row._count._all]),
    );

  const openBy = asMap(open);
  const completedBy = asMap(completed);
  const overdueBy = asMap(overdue);

  return members
    .map((member) => ({
      user: toUserSummary(member.user),
      open: openBy.get(member.userId) ?? 0,
      completed: completedBy.get(member.userId) ?? 0,
      overdue: overdueBy.get(member.userId) ?? 0,
    }))
    .sort((a, b) => b.open + b.overdue - (a.open + a.overdue));
}

/**
 * Everything the dashboard needs, in one request.
 *
 * A dashboard that fires eight requests is eight chances to render half-loaded, so
 * the aggregation happens here and the client makes a single call.
 */
export async function getDashboard(
  workspace: WorkspaceContext,
  userId: string,
  query: DashboardQuery,
): Promise<DashboardSummary> {
  if (query.projectId) await assertProjectAccess(workspace, userId, query.projectId, 'VIEWER');

  const taskScope: Prisma.TaskWhereInput = {
    project: { workspaceId: workspace.id, ...(query.projectId ? { id: query.projectId } : {}) },
  };

  const projectScope: Prisma.ProjectWhereInput = {
    workspaceId: workspace.id,
    ...(query.projectId ? { id: query.projectId } : {}),
  };

  const [
    projectCount,
    activeProjectCount,
    memberCount,
    statusGroups,
    priorityGroups,
    overdueCount,
    throughput,
    workload,
    upcoming,
    recentActivity,
  ] = await Promise.all([
    prisma.project.count({ where: projectScope }),
    prisma.project.count({ where: { ...projectScope, status: 'ACTIVE' } }),
    prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
    prisma.task.groupBy({ by: ['status'], where: taskScope, _count: { _all: true } }),
    prisma.task.groupBy({ by: ['priority'], where: taskScope, _count: { _all: true } }),
    prisma.task.count({
      where: { ...taskScope, status: { not: 'DONE' }, dueDate: { lt: new Date() } },
    }),
    loadThroughput(workspace.id, query.projectId, query.days),
    loadWorkload(workspace.id, taskScope),
    prisma.task.findMany({
      where: { ...taskScope, status: { not: 'DONE' }, dueDate: { gte: new Date() } },
      include: taskInclude,
      orderBy: { dueDate: 'asc' },
      take: 6,
    }),
    prisma.activity.findMany({
      where: {
        workspaceId: workspace.id,
        ...(query.projectId ? { projectId: query.projectId } : {}),
      },
      include: activityInclude,
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const statusCounts = new Map(statusGroups.map((row) => [row.status, row._count._all]));
  const priorityCounts = new Map(priorityGroups.map((row) => [row.priority, row._count._all]));

  const totalTasks = statusGroups.reduce((sum, row) => sum + row._count._all, 0);
  const completedTasks = statusCounts.get('DONE') ?? 0;

  return {
    totals: {
      projects: projectCount,
      activeProjects: activeProjectCount,
      tasks: totalTasks,
      completedTasks,
      overdueTasks: overdueCount,
      members: memberCount,
    },
    completionRate: toPercentage(completedTasks, totalTasks),
    tasksByStatus: TASK_STATUS_ORDER.map((status: TaskStatus) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    })),
    tasksByPriority: TASK_PRIORITIES.map((priority: TaskPriority) => ({
      priority,
      count: priorityCounts.get(priority) ?? 0,
    })),
    throughput,
    workload,
    upcomingDeadlines: upcoming.map(toTask),
    recentActivity: recentActivity.map(toActivity),
  };
}
