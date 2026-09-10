import {
  boardQuerySchema,
  createTaskSchema,
  idSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
} from '@nova/shared';
import { z } from 'zod';
import { sendCreated, sendData, sendNoContent } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import * as taskService from './task.service.js';

const taskParams = z.object({ taskId: idSchema });

export const listTasksHandler = defineRoute(
  { query: listTasksQuerySchema },
  async ({ query, workspace, user, res }) =>
    sendData(res, await taskService.listTasks(workspace, user.id, query)),
);

export const boardHandler = defineRoute(
  { query: boardQuerySchema },
  async ({ query, workspace, user, res }) =>
    sendData(res, await taskService.getBoard(workspace, user.id, query)),
);

export const createTaskHandler = defineRoute(
  { body: createTaskSchema },
  async ({ body, workspace, user, res }) =>
    sendCreated(res, await taskService.createTask(workspace, user.id, body)),
);

export const getTaskHandler = defineRoute(
  { params: taskParams },
  async ({ params, workspace, user, res }) =>
    sendData(res, await taskService.getTask(workspace, user.id, params.taskId)),
);

export const updateTaskHandler = defineRoute(
  { params: taskParams, body: updateTaskSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(res, await taskService.updateTask(workspace, user.id, params.taskId, body)),
);

export const moveTaskHandler = defineRoute(
  { params: taskParams, body: moveTaskSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(res, await taskService.moveTask(workspace, user.id, params.taskId, body)),
);

export const deleteTaskHandler = defineRoute(
  { params: taskParams },
  async ({ params, workspace, user, res }) => {
    await taskService.deleteTask(workspace, user.id, params.taskId);
    return sendNoContent(res);
  },
);
