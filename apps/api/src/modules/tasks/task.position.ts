import { POSITION_STEP } from '@nova/shared';
import type { TaskStatus } from '@nova/shared';
import type { Db } from '../activity/activity.service.js';

/**
 * Board ordering uses fractional indexes.
 *
 * Dropping a card between two neighbours only rewrites that one row — the rest of
 * the column is untouched, so two people dragging different cards at the same time
 * do not clobber each other's work the way a "reindex the whole column" approach
 * would.
 *
 * Repeated splits eventually exhaust double precision, so when neighbours get
 * closer than `MIN_GAP` the column is renormalised back onto clean multiples of
 * `POSITION_STEP`.
 */
const MIN_GAP = 0.0001;

export interface NeighbourPositions {
  /** Position of the card that will sit immediately above the dropped one. */
  before: number | null;
  /** Position of the card that will sit immediately below the dropped one. */
  after: number | null;
}

export function computePosition({ before, after }: NeighbourPositions): number {
  if (before === null && after === null) return 0;
  if (before === null) return (after as number) - POSITION_STEP;
  if (after === null) return before + POSITION_STEP;
  return (before + after) / 2;
}

export function needsRenormalisation({ before, after }: NeighbourPositions): boolean {
  if (before === null || after === null) return false;
  return Math.abs(after - before) < MIN_GAP;
}

/**
 * Rewrites a column onto evenly spaced positions, preserving the current order.
 * Returns the new position for `focusTaskId` so the caller can keep the dragged
 * card exactly where the user dropped it.
 */
export async function renormaliseColumn(
  db: Db,
  projectId: string,
  status: TaskStatus,
): Promise<void> {
  const tasks = await db.task.findMany({
    where: { projectId, status },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  await Promise.all(
    tasks.map((task, index) =>
      db.task.update({ where: { id: task.id }, data: { position: index * POSITION_STEP } }),
    ),
  );
}

/** Position for a brand new card, which is placed at the top of its column. */
export async function positionForNewTask(
  db: Db,
  projectId: string,
  status: TaskStatus,
): Promise<number> {
  const top = await db.task.findFirst({
    where: { projectId, status },
    orderBy: { position: 'asc' },
    select: { position: true },
  });

  return top ? top.position - POSITION_STEP : 0;
}
