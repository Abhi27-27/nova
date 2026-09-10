import { PROJECT_ROLE_RANK, WORKSPACE_ROLE_RANK, type ProjectRole } from '@nova/shared';
import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';
import type { WorkspaceContext } from '../../types/express.js';

export interface ProjectAccess {
  projectId: string;
  workspaceId: string;
  key: string;
  name: string;
  /** `null` when the caller reaches the project through a workspace-level role. */
  projectRole: ProjectRole | null;
}

/**
 * The single authorization gate for everything under a project.
 *
 * Two things are checked together, and always in this order:
 *
 *  1. the project belongs to the caller's current workspace — this is what makes
 *     cross-tenant access impossible, and it runs before any role logic;
 *  2. the caller clears `minimumRole`, either through their project role or through
 *     a workspace ADMIN/OWNER role, which implicitly grants LEAD everywhere.
 *
 * A project that exists in another workspace reports 404 rather than 403, so the
 * API never confirms the existence of resources the caller cannot see.
 */
export async function assertProjectAccess(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
  minimumRole: ProjectRole = 'VIEWER',
): Promise<ProjectAccess> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
    select: {
      id: true,
      workspaceId: true,
      key: true,
      name: true,
      members: { where: { userId }, select: { role: true }, take: 1 },
    },
  });

  if (!project) throw ApiError.notFound('Project');

  const projectRole = project.members[0]?.role ?? null;
  const isWorkspaceManager = WORKSPACE_ROLE_RANK[workspace.role] >= WORKSPACE_ROLE_RANK.ADMIN;

  const effectiveRank = isWorkspaceManager
    ? PROJECT_ROLE_RANK.LEAD
    : projectRole
      ? PROJECT_ROLE_RANK[projectRole]
      : // Workspace members who have not joined the project can still read it —
        // NOVA workspaces are collaborative by default — but nothing more.
        PROJECT_ROLE_RANK.VIEWER;

  if (effectiveRank < PROJECT_ROLE_RANK[minimumRole]) {
    throw ApiError.forbidden(
      `This action requires the ${minimumRole.toLowerCase()} role on this project`,
    );
  }

  return {
    projectId: project.id,
    workspaceId: project.workspaceId,
    key: project.key,
    name: project.name,
    projectRole,
  };
}
