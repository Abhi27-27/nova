import {
  slugify,
  type CreateWorkspaceInput,
  type InviteMemberInput,
  type UpdateWorkspaceInput,
  type WorkspaceRole,
} from '@nova/shared';
import type { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/api-error.js';
import { generateOpaqueToken } from '../../lib/crypto.js';
import { prisma } from '../../lib/prisma.js';
import { recordActivity, type Db } from '../activity/activity.service.js';
import { notify } from '../notifications/notification.service.js';
import { toUserSummary, userSummarySelect } from '../users/user.mapper.js';
import {
  invitationInclude,
  toInvitation,
  toWorkspace,
  toWorkspaceMember,
  toWorkspaceSummary,
  workspaceMemberInclude,
} from './workspace.mapper.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Labels every new workspace starts with, so boards are useful from minute one. */
const STARTER_LABELS = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#6366f1' },
  { name: 'Improvement', color: '#10b981' },
  { name: 'Design', color: '#ec4899' },
  { name: 'Documentation', color: '#f59e0b' },
];

const workspaceCountInclude = {
  _count: { select: { members: true, projects: true } },
} satisfies Prisma.WorkspaceInclude;

/**
 * Finds a free slug by appending `-2`, `-3`, ... to the preferred one.
 * Bounded so a pathological name cannot spin forever.
 */
async function resolveUniqueSlug(preferred: string, db: Db = prisma): Promise<string> {
  const base = slugify(preferred) || 'workspace';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${base}-${generateOpaqueToken(4).toLowerCase()}`;
}

/**
 * Creates a workspace, makes `userId` its owner and seeds the starter labels.
 *
 * Exposed separately from `createWorkspace` so that registration can run it inside
 * the same transaction that creates the user account — a half-created account with
 * no workspace would leave the user staring at an empty app.
 */
export async function bootstrapWorkspace(db: Db, userId: string, input: CreateWorkspaceInput) {
  const slug = await resolveUniqueSlug(input.slug ?? input.name, db);

  const created = await db.workspace.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      members: { create: { userId, role: 'OWNER' } },
      labels: { createMany: { data: STARTER_LABELS } },
    },
    include: workspaceCountInclude,
  });

  await recordActivity(
    {
      workspaceId: created.id,
      actorId: userId,
      type: 'MEMBER_JOINED',
      metadata: { role: 'OWNER' },
    },
    db,
  );

  return created;
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const workspace = await prisma.$transaction((tx) => bootstrapWorkspace(tx, userId, input));
  return toWorkspace(workspace, 'OWNER');
}

export async function listWorkspacesForUser(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    include: { workspace: { include: workspaceCountInclude } },
  });

  return memberships.map((membership) => toWorkspace(membership.workspace, membership.role));
}

export async function getWorkspace(workspaceId: string, role: WorkspaceRole) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: workspaceCountInclude,
  });

  if (!workspace) throw ApiError.notFound('Workspace');
  return toWorkspace(workspace, role);
}

export async function updateWorkspace(
  workspaceId: string,
  role: WorkspaceRole,
  input: UpdateWorkspaceInput,
) {
  const data: Prisma.WorkspaceUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.slug !== undefined) data.slug = await resolveUniqueSlug(input.slug);

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
    include: workspaceCountInclude,
  });

  return toWorkspace(workspace, role);
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  const remaining = await prisma.workspaceMember.count({ where: { userId } });
  if (remaining <= 1) {
    throw ApiError.conflict('You cannot delete your only workspace');
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function listMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: workspaceMemberInclude,
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });

  return members.map(toWorkspaceMember);
}

/**
 * Invites someone by email.
 *
 * When the address already belongs to a NOVA account the member is added
 * immediately — there is no mail server in this deployment, so requiring an email
 * round-trip would make the feature undemonstrable. Unknown addresses get a
 * tokenised invitation link that the inviter can copy and share.
 */
export async function inviteMember(workspaceId: string, actorId: string, input: InviteMemberInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: userSummarySelect,
  });

  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      select: { id: true },
    });

    if (alreadyMember) throw ApiError.conflict('That person is already in this workspace');

    const membership = await prisma.workspaceMember.create({
      data: { workspaceId, userId: existingUser.id, role: input.role },
      include: workspaceMemberInclude,
    });

    await recordActivity({
      workspaceId,
      actorId,
      type: 'MEMBER_JOINED',
      metadata: { memberName: existingUser.name, role: input.role },
    });

    await notify(
      {
        userId: existingUser.id,
        type: 'WORKSPACE_INVITE',
        title: 'You were added to a workspace',
        body: 'You now have access to a new NOVA workspace.',
        link: '/app',
      },
      { skipUserId: actorId },
    );

    return { kind: 'member' as const, member: toWorkspaceMember(membership) };
  }

  const pending = await prisma.invitation.findFirst({
    where: { workspaceId, email: input.email, status: 'PENDING' },
    select: { id: true },
  });

  if (pending) throw ApiError.conflict('An invitation is already pending for that address');

  const invitation = await prisma.invitation.create({
    data: {
      workspaceId,
      email: input.email,
      role: input.role,
      token: generateOpaqueToken(32),
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      invitedById: actorId,
    },
    include: invitationInclude,
  });

  await recordActivity({
    workspaceId,
    actorId,
    type: 'MEMBER_INVITED',
    metadata: { email: input.email, role: input.role },
  });

  return {
    kind: 'invitation' as const,
    invitation: toInvitation(invitation, true),
    inviteUrl: `${env.WEB_APP_URL}/invite/${invitation.token}`,
  };
}

export async function listInvitations(workspaceId: string) {
  const invitations = await prisma.invitation.findMany({
    where: { workspaceId, status: 'PENDING' },
    include: invitationInclude,
    orderBy: { createdAt: 'desc' },
  });

  return invitations.map((invitation) => toInvitation(invitation, true));
}

export async function revokeInvitation(workspaceId: string, invitationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, workspaceId },
    select: { id: true, status: true },
  });

  if (!invitation) throw ApiError.notFound('Invitation');
  if (invitation.status !== 'PENDING')
    throw ApiError.conflict('That invitation is no longer pending');

  await prisma.invitation.update({ where: { id: invitationId }, data: { status: 'REVOKED' } });
}

/** Reads an invitation without consuming it, so the sign-up page can show context. */
export async function previewInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { ...invitationInclude, workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!invitation || invitation.status !== 'PENDING') throw ApiError.notFound('Invitation');
  if (invitation.expiresAt.getTime() < Date.now()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
    throw ApiError.notFound('Invitation');
  }

  return {
    email: invitation.email,
    role: invitation.role,
    workspace: invitation.workspace,
    invitedBy: toUserSummary(invitation.invitedBy),
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function acceptInvitation(token: string, userId: string, db: Db = prisma) {
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true, slug: true, description: true } } },
  });

  if (!invitation || invitation.status !== 'PENDING') throw ApiError.notFound('Invitation');

  if (invitation.expiresAt.getTime() < Date.now()) {
    await db.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
    throw ApiError.notFound('Invitation');
  }

  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
    select: { id: true },
  });

  if (!existing) {
    await db.workspaceMember.create({
      data: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
    });
  }

  await db.invitation.update({
    where: { id: invitation.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });

  await recordActivity(
    {
      workspaceId: invitation.workspaceId,
      actorId: userId,
      type: 'MEMBER_JOINED',
      metadata: { role: invitation.role, via: 'invitation' },
    },
    db,
  );

  return toWorkspaceSummary(invitation.workspace, invitation.role);
}

export async function updateMemberRole(
  workspaceId: string,
  actorId: string,
  memberId: string,
  role: WorkspaceRole,
) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: workspaceMemberInclude,
  });

  if (!member) throw ApiError.notFound('Member');
  if (member.role === 'OWNER')
    throw ApiError.forbidden('The workspace owner role cannot be changed here');
  if (member.userId === actorId) throw ApiError.forbidden('You cannot change your own role');

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: workspaceMemberInclude,
  });

  await recordActivity({
    workspaceId,
    actorId,
    type: 'MEMBER_ROLE_CHANGED',
    metadata: { memberName: member.user.name, from: member.role, to: role },
  });

  return toWorkspaceMember(updated);
}

export async function removeMember(workspaceId: string, actorId: string, memberId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: workspaceMemberInclude,
  });

  if (!member) throw ApiError.notFound('Member');
  if (member.role === 'OWNER') throw ApiError.forbidden('The workspace owner cannot be removed');

  await prisma.workspaceMember.delete({ where: { id: memberId } });

  await recordActivity({
    workspaceId,
    actorId,
    type: 'MEMBER_REMOVED',
    metadata: { memberName: member.user.name },
  });
}

/** Hands ownership to another member and demotes the previous owner to ADMIN. */
export async function transferOwnership(
  workspaceId: string,
  currentOwnerId: string,
  memberId: string,
) {
  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
    include: workspaceMemberInclude,
  });

  if (!target) throw ApiError.notFound('Member');
  if (target.userId === currentOwnerId) throw ApiError.conflict('You already own this workspace');

  await prisma.$transaction([
    prisma.workspaceMember.updateMany({
      where: { workspaceId, userId: currentOwnerId },
      data: { role: 'ADMIN' },
    }),
    prisma.workspaceMember.update({ where: { id: memberId }, data: { role: 'OWNER' } }),
  ]);

  await recordActivity({
    workspaceId,
    actorId: currentOwnerId,
    type: 'MEMBER_ROLE_CHANGED',
    metadata: { memberName: target.user.name, to: 'OWNER', transfer: true },
  });

  return listMembers(workspaceId);
}
