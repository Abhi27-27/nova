import type { NotificationType } from '@nova/shared';
import { logger } from '../../config/logger.js';
import { prisma } from '../../lib/prisma.js';
import type { Db } from '../activity/activity.service.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

/**
 * Fan-out helper for in-app notifications.
 *
 * Like the activity feed this is best-effort: a notification failure never rolls
 * back the action that triggered it. Self-notifications are dropped, because
 * being told about your own change is noise.
 */
export async function notify(
  input: CreateNotificationInput,
  options: { skipUserId?: string; db?: Db } = {},
): Promise<void> {
  if (options.skipUserId && options.skipUserId === input.userId) return;

  const db = options.db ?? prisma;

  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    logger.warn({ err: error, type: input.type }, 'Failed to create notification');
  }
}

export async function notifyMany(
  inputs: CreateNotificationInput[],
  options: { skipUserId?: string; db?: Db } = {},
): Promise<void> {
  const payload = inputs.filter((input) => input.userId !== options.skipUserId);
  if (payload.length === 0) return;

  const db = options.db ?? prisma;

  try {
    await db.notification.createMany({
      data: payload.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      })),
    });
  } catch (error) {
    logger.warn({ err: error, count: payload.length }, 'Failed to create notifications');
  }
}
