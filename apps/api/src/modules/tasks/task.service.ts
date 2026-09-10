import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  formatTaskReference,
  type BoardQuery,
  type CreateTaskInput,
  type ListTasksQuery,
  type MoveTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from '@nova/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../lib/api-error.js';
import { paginate, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import type { WorkspaceContext } from '../../types/express.js';
import { recordActivity } from '../activity/activity.service.js';
import { notify } from '../notifications/notification.service.js';
import { assertProjectAccess } from '../projects/project.access.js';
import { taskInclude, toTask } from './task.mapper.js';
import {
  computePosition,
  needsRenormalisation,
  positionForNewTask,
  renormaliseColumn,
} from './task.position.js';

/**
 * Builds the `where` clause for task queries.
 *
 * Note the first line: results are always confined to projects inside the caller's
 * workspace. Filters supplied by the client can narrow that set but never widen it.
 */
function buildTaskWhere(
  workspace: WorkspaceContext,
  userId: string,
  query: ListTasksQuery,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    project: { workspaceId: workspace.id, ...(query.projectId ? { id: query.projectId } : {}) },
  };

  const and: Prisma.TaskWhereInput[] = [];

  if (query.search) {
    and.push({
      OR: [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  if (query.status?.length) and.push({ status: { in: query.status } });
  if (query.priority?.length) and.push({ priority: { in: query.priority } });
  if (query.assigneeId?.length) and.push({ assigneeId: { in: query.assigneeId } });
  if (query.labelId?.length) and.push({ labels: { some: { labelId: { in: query.labelId } } } });

  switch (query.scope) {
    case 'me':
      and.push({ assigneeId: userId });
      break;
    case 'created':
      and.push({ createdById: userId });
      break;
    case 'unassigned':
      and.push({ assigneeId: null });
      break;
    default:
      break;
  }

  if (!query.includeDone) and.push({ status: { not: 'DONE' } });
  if (query.overdue) and.push({ status: { not: 'DONE' }, dueDate: { lt: new Date() } });
  if (query.dueBefore) and.push({ dueDate: { lte: new Date(query.dueBefore) } });
  if (query.dueAfter) and.push({ dueDate: { gte: new Date(query.dueAfter) } });

  if (and.length > 0) where.AND = and;
  return where;
}

function buildOrderBy(query: ListTasksQuery): Prisma.TaskOrderByWithRelationInput[] {
  if (query.sortBy === 'priority') {
    // Enum ordering in Postgres follows declaration order (LOW..URGENT), which is
    // exactly the ranking we want, so it can be sorted directly.
    return [{ priority: query.sortOrder }, { createdAt: 'desc' }];
  }

  if (query.sortBy === 'dueDate') {
    return [{ dueDate: { sort: query.sortOrder, nulls: 'last' } }, { createdAt: 'desc' }];
  }

  return [{ [query.sortBy]: query.sortOrder }];
}

export async function listTasks(
  workspace: WorkspaceContext,
  userId: string,
  query: ListTasksQuery,
) {
  if (query.projectId) await assertProjectAccess(workspace, userId, query.projectId, 'VIEWER');

  const where = buildTaskWhere(workspace, userId, query);
  const { skip, take } = toSkipTake(query.page, query.pageSize);

  const [rows, total] = await Promise.all([
    prisma.task.findMany({ where, include: taskInclude, orderBy: buildOrderBy(query), skip, take }),
    prisma.task.count({ where }),
  ]);

  return paginate(rows.map(toTask), total, query.page, query.pageSize);
}

/**
 * Returns every column of a project board in one round-trip. Boards are bounded by
 * a project rather than by a page, so this endpoint deliberately skips pagination.
 */
export async function getBoard(workspace: WorkspaceContext, userId: string, query: BoardQuery) {
  const project = await assertProjectAccess(workspace, userId, query.projectId, 'VIEWER');

  const and: Prisma.TaskWhereInput[] = [];
  if (query.search) and.push({ title: { contains: query.search, mode: 'insensitive' } });
  if (query.assigneeId?.length) and.push({ assigneeId: { in: query.assigneeId } });
  if (query.priority?.length) and.push({ priority: { in: query.priority } });
  if (query.labelId?.length) and.push({ labels: { some: { labelId: { in: query.labelId } } } });

  const rows = await prisma.task.findMany({
    where: { projectId: project.projectId, ...(and.length > 0 ? { AND: and } : {}) },
    include: taskInclude,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  const tasks = rows.map(toTask);
  const columns = TASK_STATUS_ORDER.map((status) => ({
    status,
    label: TASK_STATUS_LABELS[status],
    tasks: tasks.filter((task) => task.status === status),
  }));

  return { projectId: project.projectId, columns, total: tasks.length };
}

export async function getTask(workspace: WorkspaceContext, userId: string, taskId: string) {
  const row = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
    include: taskInclude,
  });

  if (!row) throw ApiError.notFound('Task');
  await assertProjectAccess(workspace, userId, row.projectId, 'VIEWER');

  return toTask(row);
}

/** Validates that every supplied label belongs to the caller's workspace. */
async function resolveLabelIds(workspaceId: string, labelIds: string[]): Promise<string[]> {
  if (labelIds.length === 0) return [];

  const labels = await prisma.label.findMany({
    where: { workspaceId, id: { in: labelIds } },
    select: { id: true },
  });

  return labels.map((label) => label.id);
}

/** Validates that an assignee is a member of the caller's workspace. */
async function assertAssignable(workspaceId: string, assigneeId: string): Promise<void> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
    select: { id: true },
  });

  if (!membership) {
    throw ApiError.badRequest('Tasks can only be assigned to members of this workspace');
  }
}

export async function createTask(
  workspace: WorkspaceContext,
  userId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const project = await assertProjectAccess(workspace, userId, input.projectId, 'MEMBER');

  if (input.assigneeId) await assertAssignable(workspace.id, input.assigneeId);
  const labelIds = await resolveLabelIds(workspace.id, input.labelIds);

  const created = await prisma.$transaction(async (tx) => {
    // Incrementing the project counter inside the transaction is what keeps task
    // references gap-free and unique under concurrent creates.
    const { taskCounter } = await tx.project.update({
      where: { id: project.projectId },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true },
    });

    const position = await positionForNewTask(tx, project.projectId, input.status);

    return tx.task.create({
      data: {
        projectId: project.projectId,
        number: taskCounter,
        title: input.title,
        description: input.description ?? null,
        status: input.status,
        priority: input.priority,
        position,
        estimateHours: input.estimateHours ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        completedAt: input.status === 'DONE' ? new Date() : null,
        assigneeId: input.assigneeId ?? null,
        createdById: userId,
        labels: { createMany: { data: labelIds.map((labelId) => ({ labelId })) } },
      },
      include: taskInclude,
    });
  });

  const task = toTask(created);

  await recordActivity({
    workspaceId: workspace.id,
    projectId: task.project.id,
    taskId: task.id,
    actorId: userId,
    type: 'TASK_CREATED',
    metadata: { reference: task.reference, title: task.title },
  });

  if (task.assignee) {
    await notify(
      {
        userId: task.assignee.id,
        type: 'TASK_ASSIGNED',
        title: `${task.reference} was assigned to you`,
        body: task.title,
        link: `/app/tasks/${task.id}`,
      },
      { skipUserId: userId },
    );
  }

  return task;
}

export async function updateTask(
  workspace: WorkspaceContext,
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
    include: taskInclude,
  });

  if (!existing) throw ApiError.notFound('Task');
  await assertProjectAccess(workspace, userId, existing.projectId, 'MEMBER');

  if (input.assigneeId) await assertAssignable(workspace.id, input.assigneeId);

  const data: Prisma.TaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.estimateHours !== undefined) data.estimateHours = input.estimateHours;
  if (input.startDate !== undefined)
    data.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;

  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true };
  }

  if (input.status !== undefined && input.status !== existing.status) {
    data.status = input.status;
    data.completedAt = input.status === 'DONE' ? new Date() : null;
    // Moving between columns through the detail panel drops the card at the top of
    // its new column, matching what a drag to the same column would do.
    data.position = await positionForNewTask(prisma, existing.projectId, input.status);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.labelIds !== undefined) {
      const labelIds = await resolveLabelIds(workspace.id, input.labelIds);
      await tx.taskLabel.deleteMany({ where: { taskId } });
      if (labelIds.length > 0) {
        await tx.taskLabel.createMany({ data: labelIds.map((labelId) => ({ taskId, labelId })) });
      }
    }

    return tx.task.update({ where: { id: taskId }, data, include: taskInclude });
  });

  const task = toTask(updated);
  await emitUpdateSignals(workspace, userId, existing, task, input);

  return task;
}

/**
 * Writes the audit trail and notifications for an update.
 *
 * Kept apart from the write itself so `updateTask` reads as a single intent, and
 * so that a failure in the (best-effort) signal layer cannot obscure the update.
 */
async function emitUpdateSignals(
  workspace: WorkspaceContext,
  actorId: string,
  before: { status: TaskStatus; assigneeId: string | null; priority: string },
  after: Task,
  input: UpdateTaskInput,
): Promise<void> {
  const base = {
    workspaceId: workspace.id,
    projectId: after.project.id,
    taskId: after.id,
    actorId,
  };

  if (input.status !== undefined && input.status !== before.status) {
    const completed = input.status === 'DONE';
    await recordActivity({
      ...base,
      type: completed
        ? 'TASK_COMPLETED'
        : before.status === 'DONE'
          ? 'TASK_REOPENED'
          : 'TASK_STATUS_CHANGED',
      metadata: {
        reference: after.reference,
        title: after.title,
        from: TASK_STATUS_LABELS[before.status],
        to: TASK_STATUS_LABELS[input.status],
      },
    });

    if (after.assignee) {
      await notify(
        {
          userId: after.assignee.id,
          type: 'TASK_STATUS_CHANGED',
          title: `${after.reference} moved to ${TASK_STATUS_LABELS[input.status]}`,
          body: after.title,
          link: `/app/tasks/${after.id}`,
        },
        { skipUserId: actorId },
      );
    }
  }

  if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
    await recordActivity({
      ...base,
      type: after.assignee ? 'TASK_ASSIGNED' : 'TASK_UNASSIGNED',
      metadata: {
        reference: after.reference,
        title: after.title,
        assigneeName: after.assignee?.name ?? null,
      },
    });

    if (after.assignee) {
      await notify(
        {
          userId: after.assignee.id,
          type: 'TASK_ASSIGNED',
          title: `${after.reference} was assigned to you`,
          body: after.title,
          link: `/app/tasks/${after.id}`,
        },
        { skipUserId: actorId },
      );
    }
  }

  if (input.priority !== undefined && input.priority !== before.priority) {
    await recordActivity({
      ...base,
      type: 'TASK_PRIORITY_CHANGED',
      metadata: {
        reference: after.reference,
        title: after.title,
        from: TASK_PRIORITY_LABELS[before.priority as keyof typeof TASK_PRIORITY_LABELS],
        to: TASK_PRIORITY_LABELS[input.priority],
      },
    });
  }

  const contentChanged =
    input.title !== undefined || input.description !== undefined || input.dueDate !== undefined;

  if (contentChanged) {
    await recordActivity({
      ...base,
      type: 'TASK_UPDATED',
      metadata: { reference: after.reference, title: after.title },
    });
  }
}

/**
 * Drag-and-drop handler.
 *
 * The client sends the neighbours the card was dropped between; the server derives
 * the position from them rather than trusting a client-supplied index, so two
 * concurrent drags cannot produce a board that disagrees between browsers.
 */
export async function moveTask(
  workspace: WorkspaceContext,
  userId: string,
  taskId: string,
  input: MoveTaskInput,
): Promise<Task> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
    select: {
      id: true,
      projectId: true,
      status: true,
      title: true,
      number: true,
      assigneeId: true,
    },
  });

  if (!existing) throw ApiError.notFound('Task');
  await assertProjectAccess(workspace, userId, existing.projectId, 'MEMBER');

  const neighbourIds = [input.beforeTaskId, input.afterTaskId].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );

  const neighbours = await prisma.task.findMany({
    where: { id: { in: neighbourIds }, projectId: existing.projectId, status: input.status },
    select: { id: true, position: true },
  });

  const positionOf = (id: string | null | undefined) =>
    (id ? neighbours.find((task) => task.id === id)?.position : undefined) ?? null;

  const bounds = {
    before: positionOf(input.beforeTaskId),
    after: positionOf(input.afterTaskId),
  };

  const updated = await prisma.$transaction(async (tx) => {
    if (needsRenormalisation(bounds)) {
      await renormaliseColumn(tx, existing.projectId, input.status);

      const refreshed = await tx.task.findMany({
        where: { id: { in: neighbourIds }, projectId: existing.projectId, status: input.status },
        select: { id: true, position: true },
      });

      bounds.before =
        (input.beforeTaskId
          ? refreshed.find((task) => task.id === input.beforeTaskId)?.position
          : undefined) ?? null;
      bounds.after =
        (input.afterTaskId
          ? refreshed.find((task) => task.id === input.afterTaskId)?.position
          : undefined) ?? null;
    }

    const statusChanged = existing.status !== input.status;

    return tx.task.update({
      where: { id: taskId },
      data: {
        status: input.status,
        position: computePosition(bounds),
        ...(statusChanged ? { completedAt: input.status === 'DONE' ? new Date() : null } : {}),
      },
      include: taskInclude,
    });
  });

  const task = toTask(updated);

  if (existing.status !== input.status) {
    await recordActivity({
      workspaceId: workspace.id,
      projectId: existing.projectId,
      taskId,
      actorId: userId,
      type: input.status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      metadata: {
        reference: task.reference,
        title: task.title,
        from: TASK_STATUS_LABELS[existing.status],
        to: TASK_STATUS_LABELS[input.status],
      },
    });

    if (existing.assigneeId) {
      await notify(
        {
          userId: existing.assigneeId,
          type: 'TASK_STATUS_CHANGED',
          title: `${task.reference} moved to ${TASK_STATUS_LABELS[input.status]}`,
          body: task.title,
          link: `/app/tasks/${task.id}`,
        },
        { skipUserId: userId },
      );
    }
  }

  return task;
}

export async function deleteTask(workspace: WorkspaceContext, userId: string, taskId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
    select: {
      id: true,
      projectId: true,
      number: true,
      title: true,
      project: { select: { key: true } },
    },
  });

  if (!existing) throw ApiError.notFound('Task');
  await assertProjectAccess(workspace, userId, existing.projectId, 'MEMBER');

  await prisma.task.delete({ where: { id: taskId } });

  await recordActivity({
    workspaceId: workspace.id,
    projectId: existing.projectId,
    actorId: userId,
    type: 'TASK_DELETED',
    metadata: {
      reference: formatTaskReference(existing.project.key, existing.number),
      title: existing.title,
    },
  });
}
