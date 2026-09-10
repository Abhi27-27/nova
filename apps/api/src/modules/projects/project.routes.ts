import { Router } from 'express';
import * as controller from './project.controller.js';

/**
 * `/api/v1/projects`
 *
 * Mounted behind `authenticate()` + `workspaceContext()`, so every handler can
 * rely on `req.user` and `req.workspace` being present and verified.
 */
export const projectRouter: Router = Router();

projectRouter.get('/', controller.listProjectsHandler);
projectRouter.post('/', controller.createProjectHandler);

projectRouter.get('/:projectId', controller.getProjectHandler);
projectRouter.patch('/:projectId', controller.updateProjectHandler);
projectRouter.delete('/:projectId', controller.deleteProjectHandler);

projectRouter.get('/:projectId/members', controller.listProjectMembersHandler);
projectRouter.post('/:projectId/members', controller.addProjectMemberHandler);
projectRouter.patch('/:projectId/members/:memberId', controller.updateProjectMemberHandler);
projectRouter.delete('/:projectId/members/:memberId', controller.removeProjectMemberHandler);
