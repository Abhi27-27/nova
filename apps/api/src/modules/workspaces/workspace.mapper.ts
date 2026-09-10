import type { Invitation, Workspace, WorkspaceMember, WorkspaceSummary } from '@nova/shared';
import { Prisma } from '@prisma/client';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';

export const workspaceMemberInclude = {
  user: { select: userSummarySelect },
} satisfies Prisma.WorkspaceMemberInclude;

type MemberRow = Prisma.WorkspaceMemberGetPayload<{ include: typeof workspaceMemberInclude }>;

export function toWorkspaceMember(row: MemberRow): WorkspaceMember {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
    user: toUserSummary(row.user),
  };
}

type WorkspaceRow = Prisma.WorkspaceGetPayload<{
  include: { _count: { select: { members: true; projects: true } } };
}>;

export function toWorkspaceSummary(
  row: Pick<WorkspaceRow, 'id' | 'name' | 'slug' | 'description'>,
  role: WorkspaceSummary['role'],
): WorkspaceSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    role,
  };
}

export function toWorkspace(row: WorkspaceRow, role: WorkspaceSummary['role']): Workspace {
  return {
    ...toWorkspaceSummary(row, role),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    memberCount: row._count.members,
    projectCount: row._count.projects,
  };
}

export const invitationInclude = {
  invitedBy: { select: userSummarySelect },
} satisfies Prisma.InvitationInclude;

type InvitationRow = Prisma.InvitationGetPayload<{ include: typeof invitationInclude }>;

export function toInvitation(row: InvitationRow, includeToken = false): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    invitedBy: toUserSummary(row.invitedBy),
    ...(includeToken ? { token: row.token } : {}),
  };
}
