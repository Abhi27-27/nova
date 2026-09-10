import { formatTaskReference, type Activity } from '@nova/shared';
import { Prisma } from '@prisma/client';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';

export const activityInclude = {
  actor: { select: userSummarySelect },
  project: { select: { id: true, name: true, key: true } },
  task: { select: { id: true, title: true, number: true, project: { select: { key: true } } } },
} satisfies Prisma.ActivityInclude;

type ActivityRow = Prisma.ActivityGetPayload<{ include: typeof activityInclude }>;

/**
 * Flattens an activity row into a feed item.
 *
 * The task reference is recomputed from the live project key so a renamed key is
 * reflected in history, while the metadata snapshot preserves what was true at the
 * time (for example, a task that has since been deleted).
 */
export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    actor: toUserSummary(row.actor),
    context: {
      projectId: row.project?.id ?? null,
      projectName: row.project?.name ?? null,
      taskId: row.task?.id ?? null,
      taskReference: row.task ? formatTaskReference(row.task.project.key, row.task.number) : null,
      taskTitle: row.task?.title ?? null,
    },
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}
