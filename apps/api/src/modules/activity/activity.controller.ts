import { activityQuerySchema, type ActivityQuery } from '@nova/shared';
import type { Prisma } from '@prisma/client';
import { paginate, sendData, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { defineRoute } from '../../lib/route.js';
import { activityInclude, toActivity } from './activity.mapper.js';

/**
 * `GET /api/v1/activity` — the workspace audit trail.
 *
 * This module has no service file of its own: the feed is a single read with no
 * business rules beyond scoping, so a service layer would be a pass-through.
 */
export async function listActivity(workspaceId: string, query: ActivityQuery) {
  const where: Prisma.ActivityWhereInput = { workspaceId };
  if (query.projectId) where.projectId = query.projectId;
  if (query.taskId) where.taskId = query.taskId;
  if (query.actorId) where.actorId = query.actorId;

  const { skip, take } = toSkipTake(query.page, query.pageSize);

  const [rows, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.activity.count({ where }),
  ]);

  return paginate(rows.map(toActivity), total, query.page, query.pageSize);
}

export const listActivityHandler = defineRoute(
  { query: activityQuerySchema },
  async ({ query, workspace, res }) => sendData(res, await listActivity(workspace.id, query)),
);
