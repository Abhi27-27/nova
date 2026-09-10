import { formatTaskReference, type Label, type Task } from '@nova/shared';
import { Prisma } from '@prisma/client';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';
import { toProjectSummary } from '../projects/project.mapper.js';

export const taskInclude = {
  project: { select: { id: true, name: true, key: true, color: true, status: true } },
  assignee: { select: userSummarySelect },
  createdBy: { select: userSummarySelect },
  labels: { include: { label: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export function toLabel(row: {
  id: string;
  name: string;
  color: string;
  workspaceId: string;
}): Label {
  return { id: row.id, name: row.name, color: row.color, workspaceId: row.workspaceId };
}

export function toTask(row: TaskRow): Task {
  const isDone = row.status === 'DONE';

  return {
    id: row.id,
    reference: formatTaskReference(row.project.key, row.number),
    number: row.number,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    position: row.position,
    estimateHours: row.estimateHours,
    startDate: row.startDate?.toISOString() ?? null,
    dueDate: row.dueDate?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    project: toProjectSummary(row.project),
    assignee: row.assignee ? toUserSummary(row.assignee) : null,
    createdBy: toUserSummary(row.createdBy),
    labels: row.labels.map((entry) => toLabel(entry.label)),
    commentCount: row._count.comments,
    // Derived here rather than in the client so every surface agrees on what
    // "overdue" means, including the dashboard aggregates.
    isOverdue: !isDone && row.dueDate !== null && row.dueDate.getTime() < Date.now(),
  };
}
