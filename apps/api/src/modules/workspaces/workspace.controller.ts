import {
  createWorkspaceSchema,
  idSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from '@nova/shared';
import { z } from 'zod';
import { sendCreated, sendData, sendNoContent } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import * as workspaceService from './workspace.service.js';

const memberParams = z.object({ memberId: idSchema });
const invitationParams = z.object({ invitationId: idSchema });

export const listWorkspacesHandler = defineRoute({}, async ({ user, res }) =>
  sendData(res, await workspaceService.listWorkspacesForUser(user.id)),
);

export const createWorkspaceHandler = defineRoute(
  { body: createWorkspaceSchema },
  async ({ body, user, res }) =>
    sendCreated(res, await workspaceService.createWorkspace(user.id, body)),
);

/** Returns the workspace resolved by `workspaceContext` for this request. */
export const getCurrentWorkspaceHandler = defineRoute({}, async ({ workspace, res }) =>
  sendData(res, await workspaceService.getWorkspace(workspace.id, workspace.role)),
);

export const updateWorkspaceHandler = defineRoute(
  { body: updateWorkspaceSchema },
  async ({ body, workspace, res }) =>
    sendData(res, await workspaceService.updateWorkspace(workspace.id, workspace.role, body)),
);

export const deleteWorkspaceHandler = defineRoute({}, async ({ workspace, user, res }) => {
  await workspaceService.deleteWorkspace(workspace.id, user.id);
  return sendNoContent(res);
});

export const listMembersHandler = defineRoute({}, async ({ workspace, res }) =>
  sendData(res, await workspaceService.listMembers(workspace.id)),
);

export const inviteMemberHandler = defineRoute(
  { body: inviteMemberSchema },
  async ({ body, workspace, user, res }) =>
    sendCreated(res, await workspaceService.inviteMember(workspace.id, user.id, body)),
);

export const listInvitationsHandler = defineRoute({}, async ({ workspace, res }) =>
  sendData(res, await workspaceService.listInvitations(workspace.id)),
);

export const revokeInvitationHandler = defineRoute(
  { params: invitationParams },
  async ({ params, workspace, res }) => {
    await workspaceService.revokeInvitation(workspace.id, params.invitationId);
    return sendNoContent(res);
  },
);

export const updateMemberRoleHandler = defineRoute(
  { params: memberParams, body: updateMemberRoleSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(
      res,
      await workspaceService.updateMemberRole(workspace.id, user.id, params.memberId, body.role),
    ),
);

export const removeMemberHandler = defineRoute(
  { params: memberParams },
  async ({ params, workspace, user, res }) => {
    await workspaceService.removeMember(workspace.id, user.id, params.memberId);
    return sendNoContent(res);
  },
);

export const transferOwnershipHandler = defineRoute(
  { params: memberParams },
  async ({ params, workspace, user, res }) =>
    sendData(res, await workspaceService.transferOwnership(workspace.id, user.id, params.memberId)),
);
