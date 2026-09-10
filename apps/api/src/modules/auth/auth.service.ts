import type {
  AuthSession,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  WorkspaceSummary,
} from '@nova/shared';
import { ApiError } from '../../lib/api-error.js';
import { generateOpaqueToken, hashPassword, hashToken, verifyPassword } from '../../lib/crypto.js';
import { prisma } from '../../lib/prisma.js';
import { refreshTokenExpiry, signAccessToken } from '../../lib/tokens.js';
import { toUser, toUserSummary, userSelect } from '../users/user.mapper.js';
import { acceptInvitation, bootstrapWorkspace } from '../workspaces/workspace.service.js';

export interface RequestMeta {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  session: AuthSession;
}

/**
 * Issues a fresh access/refresh pair and persists the refresh token digest.
 * Called by register, login and refresh so token handling lives in exactly one place.
 */
async function issueSession(userId: string, meta: RequestMeta): Promise<IssuedSession> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw ApiError.unauthorized('Your account is no longer available');

  const refreshToken = generateOpaqueToken(48);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
    },
  });

  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken,
    session: {
      user: toUser(user),
      defaultWorkspace: await findDefaultWorkspace(userId),
    },
  };
}

async function findDefaultWorkspace(userId: string): Promise<WorkspaceSummary | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    include: { workspace: { select: { id: true, name: true, slug: true, description: true } } },
  });

  if (!membership) return null;

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    description: membership.workspace.description,
    role: membership.role,
  };
}

/**
 * Creates an account.
 *
 * The user row, their first workspace (or the invitation they were sent) and the
 * starter labels are written in a single transaction, so a failure part-way through
 * leaves nothing behind.
 */
export async function register(input: RegisterInput, meta: RequestMeta): Promise<IssuedSession> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.conflict('An account already exists for that email address');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
      select: { id: true, name: true },
    });

    if (input.invitationToken) {
      await acceptInvitation(input.invitationToken, created.id, tx);
    } else {
      const firstName = created.name.split(' ')[0] ?? created.name;
      await bootstrapWorkspace(tx, created.id, {
        name: input.workspaceName ?? `${firstName}'s Workspace`,
        description: null,
      });
    }

    return created;
  });

  return issueSession(user.id, meta);
}

/**
 * Verifies credentials.
 *
 * The same message is returned whether the email is unknown or the password is
 * wrong, so the endpoint cannot be used to enumerate registered addresses.
 */
export async function login(input: LoginInput, meta: RequestMeta): Promise<IssuedSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    // Spend comparable time on the miss path to avoid a timing oracle.
    await hashPassword(input.password);
    throw ApiError.unauthorized('That email or password is not correct');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('That email or password is not correct');

  return issueSession(user.id, meta);
}

/**
 * Rotates a refresh token.
 *
 * The presented token is revoked as it is exchanged. Presenting an already-revoked
 * token means it was replayed — likely stolen — so every session for that user is
 * torn down rather than just rejecting the single request.
 */
export async function refresh(
  token: string | undefined,
  meta: RequestMeta,
): Promise<IssuedSession> {
  if (!token) throw ApiError.unauthorized('Your session has expired');

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, revokedAt: true },
  });

  if (!stored) throw ApiError.unauthorized('Your session has expired');

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized('Your session has expired');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    throw ApiError.unauthorized('Your session has expired');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return issueSession(stored.userId, meta);
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Signs the user out everywhere — used after a password change. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSession(userId: string): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) throw ApiError.unauthorized('Your account is no longer available');

  return { user: toUser(user), defaultWorkspace: await findDefaultWorkspace(userId) };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  meta: RequestMeta,
): Promise<IssuedSession> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) throw ApiError.unauthorized();

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.validation('Some fields need your attention', {
      currentPassword: ['That is not your current password'],
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  // Every other device is signed out, then this one is given a fresh session.
  await revokeAllSessions(userId);

  return issueSession(userId, meta);
}

/** Members of the caller's workspaces — used by assignee pickers and mentions. */
export async function listVisibleUsers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((member) => toUserSummary(member.user));
}
