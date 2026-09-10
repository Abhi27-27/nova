import { WORKSPACE_ROLE_RANK, type WorkspaceRole } from '@nova/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../lib/api-error.js';
import { prisma } from '../lib/prisma.js';

export const WORKSPACE_HEADER = 'x-workspace-id';

/**
 * Resolves the tenant for the request.
 *
 * The workspace is taken from the `X-Workspace-Id` header (or a `workspaceId`
 * query parameter, which keeps hand-written cURL calls simple). When neither is
 * supplied the user's earliest workspace is used, so a fresh sign-in works before
 * the client has picked one.
 *
 * Membership is verified here, once. Every downstream query then filters by
 * `req.workspace.id`, which is what makes cross-tenant reads structurally
 * impossible rather than merely unlikely.
 */
export function workspaceContext(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw ApiError.unauthorized();

      const requested =
        req.header(WORKSPACE_HEADER) ??
        (typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined);

      const membership = requested
        ? await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: requested, userId: user.id } },
            include: { workspace: { select: { id: true, name: true, slug: true } } },
          })
        : await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            orderBy: { joinedAt: 'asc' },
            include: { workspace: { select: { id: true, name: true, slug: true } } },
          });

      if (!membership) {
        throw requested
          ? ApiError.forbidden('You are not a member of that workspace')
          : ApiError.notFound('Workspace');
      }

      req.workspace = {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
        membershipId: membership.id,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Role gate for workspace-level actions. Roles are ranked
 * (`MEMBER < ADMIN < OWNER`) so `requireWorkspaceRole('ADMIN')` also admits owners.
 */
export function requireWorkspaceRole(minimum: WorkspaceRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const workspace = req.workspace;
    if (!workspace) {
      next(ApiError.forbidden('No workspace selected for this request'));
      return;
    }

    if (WORKSPACE_ROLE_RANK[workspace.role] < WORKSPACE_ROLE_RANK[minimum]) {
      next(
        ApiError.forbidden(
          `This action requires the ${minimum.toLowerCase()} role in this workspace`,
        ),
      );
      return;
    }

    next();
  };
}
