import { createCommentSchema, idSchema, paginationSchema, updateCommentSchema } from '@nova/shared';
import { z } from 'zod';
import { sendCreated, sendData, sendNoContent } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import * as commentService from './comment.service.js';

const taskParams = z.object({ taskId: idSchema });
const commentParams = z.object({ commentId: idSchema });

export const listCommentsHandler = defineRoute(
  { params: taskParams, query: paginationSchema },
  async ({ params, query, workspace, user, res }) =>
    sendData(res, await commentService.listComments(workspace, user.id, params.taskId, query)),
);

export const createCommentHandler = defineRoute(
  { params: taskParams, body: createCommentSchema },
  async ({ params, body, workspace, user, res }) =>
    sendCreated(res, await commentService.createComment(workspace, user.id, params.taskId, body)),
);

export const updateCommentHandler = defineRoute(
  { params: commentParams, body: updateCommentSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(res, await commentService.updateComment(workspace, user.id, params.commentId, body)),
);

export const deleteCommentHandler = defineRoute(
  { params: commentParams },
  async ({ params, workspace, user, res }) => {
    await commentService.deleteComment(workspace, user.id, params.commentId);
    return sendNoContent(res);
  },
);
