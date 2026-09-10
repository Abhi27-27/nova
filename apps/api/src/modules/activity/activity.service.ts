import type { ActivityType } from '@nova/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { prisma } from '../../lib/prisma.js';

/** Accepts either the root client or an interactive transaction client. */
export type Db = PrismaClient | Prisma.TransactionClient;

export interface RecordActivityInput {
  workspaceId: string;
  actorId: string;
  type: ActivityType;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Appends to the workspace audit trail.
 *
 * The feed is a secondary concern: a failure to write history must never fail the
 * user's actual action, so errors are logged and swallowed. Callers that need the
 * write to be atomic pass the surrounding transaction as `db`.
 */
export async function recordActivity(input: RecordActivityInput, db: Db = prisma): Promise<void> {
  try {
    await db.activity.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        type: input.type,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        metadata: input.metadata ?? {},
      },
    });
  } catch (error) {
    logger.warn({ err: error, type: input.type }, 'Failed to record activity');
  }
}

export async function recordActivities(
  inputs: RecordActivityInput[],
  db: Db = prisma,
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.activity.createMany({
      data: inputs.map((input) => ({
        workspaceId: input.workspaceId,
        actorId: input.actorId,
        type: input.type,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      })),
    });
  } catch (error) {
    logger.warn({ err: error, count: inputs.length }, 'Failed to record activities');
  }
}
