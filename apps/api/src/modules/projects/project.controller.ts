import {
  addProjectMemberSchema,
  createProjectSchema,
  idSchema,
  listProjectsQuerySchema,
  updateProjectMemberSchema,
  updateProjectSchema,
} from '@nova/shared';
import { z } from 'zod';
import { sendCreated, sendData, sendNoContent } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import * as projectService from './project.service.js';

const projectParams = z.object({ projectId: idSchema });
const memberParams = projectParams.extend({ memberId: idSchema });

export const listProjectsHandler = defineRoute(
  { query: listProjectsQuerySchema },
  async ({ query, workspace, user, res }) =>
    sendData(res, await projectService.listProjects(workspace, user.id, query)),
);

export const createProjectHandler = defineRoute(
  { body: createProjectSchema },
  async ({ body, workspace, user, res }) =>
    sendCreated(res, await projectService.createProject(workspace, user.id, body)),
);

export const getProjectHandler = defineRoute(
  { params: projectParams },
  async ({ params, workspace, user, res }) =>
    sendData(res, await projectService.getProject(workspace, user.id, params.projectId)),
);

export const updateProjectHandler = defineRoute(
  { params: projectParams, body: updateProjectSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(res, await projectService.updateProject(workspace, user.id, params.projectId, body)),
);

export const deleteProjectHandler = defineRoute(
  { params: projectParams },
  async ({ params, workspace, user, res }) => {
    await projectService.deleteProject(workspace, user.id, params.projectId);
    return sendNoContent(res);
  },
);

export const listProjectMembersHandler = defineRoute(
  { params: projectParams },
  async ({ params, workspace, user, res }) =>
    sendData(res, await projectService.listProjectMembers(workspace, user.id, params.projectId)),
);

export const addProjectMemberHandler = defineRoute(
  { params: projectParams, body: addProjectMemberSchema },
  async ({ params, body, workspace, user, res }) =>
    sendCreated(
      res,
      await projectService.addProjectMember(workspace, user.id, params.projectId, body),
    ),
);

export const updateProjectMemberHandler = defineRoute(
  { params: memberParams, body: updateProjectMemberSchema },
  async ({ params, body, workspace, user, res }) =>
    sendData(
      res,
      await projectService.updateProjectMemberRole(
        workspace,
        user.id,
        params.projectId,
        params.memberId,
        body.role,
      ),
    ),
);

export const removeProjectMemberHandler = defineRoute(
  { params: memberParams },
  async ({ params, workspace, user, res }) => {
    await projectService.removeProjectMember(workspace, user.id, params.projectId, params.memberId);
    return sendNoContent(res);
  },
);
