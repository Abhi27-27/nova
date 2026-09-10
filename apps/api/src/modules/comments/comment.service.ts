import type { Comment, CreateCommentInput, PaginationInput } from '@nova/shared';
import { Prisma } from '@prisma/client';
import { ApiError } from '../../lib/api-error.js';
import { paginate, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import type { WorkspaceContext } from '../../types/express.js';
import { recordActivity } from '../activity/activity.service.js';
import { notifyMany } from '../notifications/notification.service.js';
import { assertProjectAccess } from '../projects/project.access.js';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';

const commentInclude = {
  author: { select: userSummarySelect },
} satisfies Prisma.CommentInclude;

type CommentRow = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.taskId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    // A one-second grace window absorbs the `updatedAt` write that Prisma performs
    // on insert, so freshly created comments are not labelled "edited".
    isEdited: row.updatedAt.getTime() - row.createdAt.getTime() > 1000,
    author: toUserSummary(row.author),
  };
}

/** Loads a task and proves the caller may act on it at the requested level. */
async function loadTaskForComment(
  workspace: WorkspaceContext,
  userId: string,
  taskId: string,
  minimumRole: 'VIEWER' | 'MEMBER',
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { workspaceId: workspace.id } },
    select: {
      id: true,
      projectId: true,
      title: true,
      number: true,
      assigneeId: true,
      createdById: true,
      project: { select: { key: true } },
    },
  });

  if (!task) throw ApiError.notFound('Task');
  await assertProjectAccess(workspace, userId, task.projectId, minimumRole);

  return task;
}

export async function listComments(
  workspace: WorkspaceContext,
  userId: string,
  taskId: string,
  query: PaginationInput,
) {
  await loadTaskForComment(workspace, userId, taskId, 'VIEWER');

  const { skip, take } = toSkipTake(query.page, query.pageSize);

  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    }),
    prisma.comment.count({ where: { taskId } }),
  ]);

  return paginate(rows.map(toComment), total, query.page, query.pageSize);
}

export async function createComment(
  workspace: WorkspaceContext,
  userId: string,
  taskId: string,
  input: CreateCommentInput,
) {
  const task = await loadTaskForComment(workspace, userId, taskId, 'MEMBER');

  const comment = await prisma.comment.create({
    data: { taskId, authorId: userId, body: input.body },
    include: commentInclude,
  });

  const reference = `${task.project.key}-${task.number}`;

  await recordActivity({
    workspaceId: workspace.id,
    projectId: task.projectId,
    taskId,
    actorId: userId,
    type: 'COMMENT_CREATED',
    metadata: { reference, title: task.title, excerpt: input.body.slice(0, 140) },
  });

  // The people with a stake in this task: whoever it is assigned to, and whoever
  // raised it. Deduplicated, and never the author of the comment.
  const recipients = [...new Set([task.assigneeId, task.createdById])].filter(
    (id): id is string => typeof id === 'string' && id !== userId,
  );

  await notifyMany(
    recipients.map((recipient) => ({
      userId: recipient,
      type: 'COMMENT_ON_TASK' as const,
      title: `New comment on ${reference}`,
      body: input.body.slice(0, 140),
      link: `/app/tasks/${taskId}`,
    })),
    { skipUserId: userId },
  );

  return toComment(comment);
}

export async function updateComment(
  workspace: WorkspaceContext,
  userId: string,
  commentId: string,
  input: CreateCommentInput,
) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, task: { project: { workspaceId: workspace.id } } },
    select: { id: true, authorId: true },
  });

  if (!comment) throw ApiError.notFound('Comment');
  if (comment.authorId !== userId) throw ApiError.forbidden('You can only edit your own comments');

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: input.body },
    include: commentInclude,
  });

  return toComment(updated);
}

/** Authors can delete their own comments; project leads can moderate any of them. */
export async function deleteComment(
  workspace: WorkspaceContext,
  userId: string,
  commentId: string,
) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, task: { project: { workspaceId: workspace.id } } },
    select: { id: true, authorId: true, taskId: true, task: { select: { projectId: true } } },
  });

  if (!comment) throw ApiError.notFound('Comment');

  if (comment.authorId !== userId) {
    await assertProjectAccess(workspace, userId, comment.task.projectId, 'LEAD');
  }

  await prisma.comment.delete({ where: { id: commentId } });

  await recordActivity({
    workspaceId: workspace.id,
    projectId: comment.task.projectId,
    taskId: comment.taskId,
    actorId: userId,
    type: 'COMMENT_DELETED',
    metadata: {},
  });
}
