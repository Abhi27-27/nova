import { APP_NAME } from '@nova/shared';
import { Router } from 'express';
import { env } from './config/env.js';
import { sendData } from './lib/http.js';
import { pingDatabase } from './lib/prisma.js';
import { authenticate } from './middleware/authenticate.js';
import { requireWorkspaceRole, workspaceContext } from './middleware/workspace-context.js';
import { listActivityHandler } from './modules/activity/activity.controller.js';
import { dashboardHandler } from './modules/analytics/analytics.controller.js';
import { authRouter } from './modules/auth/auth.routes.js';
import * as comments from './modules/comments/comment.controller.js';
import * as labels from './modules/labels/label.controller.js';
import * as notifications from './modules/notifications/notification.controller.js';
import { projectRouter } from './modules/projects/project.routes.js';
import * as tasks from './modules/tasks/task.controller.js';
import * as users from './modules/users/user.controller.js';
import * as workspaces from './modules/workspaces/workspace.controller.js';

/**
 * `/api/v1`
 *
 * The middleware order below is the security model of the whole service:
 *
 *   authenticate()      — who is calling?
 *   workspaceContext()  — which tenant are they in, and are they a member of it?
 *   requireWorkspaceRole() / assertProjectAccess() — may they do this specific thing?
 *
 * Only `/health` and `/auth` sit outside it.
 */
export const apiRouter: Router = Router();

apiRouter.get('/health', async (_req, res) => {
  const databaseUp = await pingDatabase();
  res.status(databaseUp ? 200 : 503).json({
    success: databaseUp,
    data: {
      service: `${APP_NAME} API`,
      status: databaseUp ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      database: databaseUp ? 'connected' : 'unreachable',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

apiRouter.use('/auth', authRouter);

// ---------------------------------------------------------------------------
// Everything below requires a signed-in user.
// ---------------------------------------------------------------------------
apiRouter.use(authenticate());

apiRouter.get('/users/me', users.getMeHandler);
apiRouter.patch('/users/me', users.updateMeHandler);

apiRouter.get('/workspaces', workspaces.listWorkspacesHandler);
apiRouter.post('/workspaces', workspaces.createWorkspaceHandler);

apiRouter.get('/notifications', notifications.listNotificationsHandler);
apiRouter.post('/notifications/read-all', notifications.markAllNotificationsReadHandler);
apiRouter.post('/notifications/:notificationId/read', notifications.markNotificationReadHandler);

// ---------------------------------------------------------------------------
// Workspace-scoped surface. `X-Workspace-Id` selects the tenant; membership is
// verified before any handler below runs.
// ---------------------------------------------------------------------------
apiRouter.use(workspaceContext());

apiRouter.get('/users', users.listWorkspaceUsersHandler);

apiRouter.get('/workspaces/current', workspaces.getCurrentWorkspaceHandler);
apiRouter.patch(
  '/workspaces/current',
  requireWorkspaceRole('ADMIN'),
  workspaces.updateWorkspaceHandler,
);
apiRouter.delete(
  '/workspaces/current',
  requireWorkspaceRole('OWNER'),
  workspaces.deleteWorkspaceHandler,
);

apiRouter.get('/workspaces/current/members', workspaces.listMembersHandler);
apiRouter.post(
  '/workspaces/current/members',
  requireWorkspaceRole('ADMIN'),
  workspaces.inviteMemberHandler,
);
apiRouter.patch(
  '/workspaces/current/members/:memberId',
  requireWorkspaceRole('ADMIN'),
  workspaces.updateMemberRoleHandler,
);
apiRouter.delete(
  '/workspaces/current/members/:memberId',
  requireWorkspaceRole('ADMIN'),
  workspaces.removeMemberHandler,
);
apiRouter.post(
  '/workspaces/current/members/:memberId/transfer-ownership',
  requireWorkspaceRole('OWNER'),
  workspaces.transferOwnershipHandler,
);

apiRouter.get(
  '/workspaces/current/invitations',
  requireWorkspaceRole('ADMIN'),
  workspaces.listInvitationsHandler,
);
apiRouter.delete(
  '/workspaces/current/invitations/:invitationId',
  requireWorkspaceRole('ADMIN'),
  workspaces.revokeInvitationHandler,
);

apiRouter.use('/projects', projectRouter);

// The board route is declared before `/tasks/:taskId` so "board" is never parsed
// as a task id.
apiRouter.get('/tasks/board', tasks.boardHandler);
apiRouter.get('/tasks', tasks.listTasksHandler);
apiRouter.post('/tasks', tasks.createTaskHandler);
apiRouter.get('/tasks/:taskId', tasks.getTaskHandler);
apiRouter.patch('/tasks/:taskId', tasks.updateTaskHandler);
apiRouter.post('/tasks/:taskId/move', tasks.moveTaskHandler);
apiRouter.delete('/tasks/:taskId', tasks.deleteTaskHandler);

apiRouter.get('/tasks/:taskId/comments', comments.listCommentsHandler);
apiRouter.post('/tasks/:taskId/comments', comments.createCommentHandler);
apiRouter.patch('/comments/:commentId', comments.updateCommentHandler);
apiRouter.delete('/comments/:commentId', comments.deleteCommentHandler);

apiRouter.get('/labels', labels.listLabelsHandler);
apiRouter.post('/labels', labels.createLabelHandler);
apiRouter.patch('/labels/:labelId', labels.updateLabelHandler);
apiRouter.delete('/labels/:labelId', labels.deleteLabelHandler);

apiRouter.get('/activity', listActivityHandler);
apiRouter.get('/analytics/dashboard', dashboardHandler);
