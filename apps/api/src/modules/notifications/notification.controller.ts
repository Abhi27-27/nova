import { idSchema, notificationQuerySchema, type Notification } from '@nova/shared';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '../../lib/api-error.js';
import { paginate, sendData, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { defineRoute } from '../../lib/route.js';

function toNotification(row: {
  id: string;
  type: Notification['type'];
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Notifications belong to a user rather than a workspace, so every query here is
 * keyed on `req.user.id` and no workspace scoping is involved.
 */
export const listNotificationsHandler = defineRoute(
  { query: notificationQuerySchema },
  async ({ query, user, res }) => {
    const where: Prisma.NotificationWhereInput = { userId: user.id };
    if (query.unreadOnly) where.readAt = null;

    const { skip, take } = toSkipTake(query.page, query.pageSize);

    const [rows, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    const page = paginate(rows.map(toNotification), total, query.page, query.pageSize);
    return sendData(res, { ...page, unreadCount });
  },
);

export const markNotificationReadHandler = defineRoute(
  { params: z.object({ notificationId: idSchema }) },
  async ({ params, user, res }) => {
    const result = await prisma.notification.updateMany({
      where: { id: params.notificationId, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await prisma.notification.findFirst({
        where: { id: params.notificationId, userId: user.id },
        select: { id: true },
      });
      if (!exists) throw ApiError.notFound('Notification');
    }

    return sendData(res, { id: params.notificationId, read: true });
  },
);

export const markAllNotificationsReadHandler = defineRoute({}, async ({ user, res }) => {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return sendData(res, { updated: result.count });
});
