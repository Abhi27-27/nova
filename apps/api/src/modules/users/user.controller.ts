import { updateProfileSchema } from '@nova/shared';
import { sendData } from '../../lib/http.js';
import { defineRoute } from '../../lib/route.js';
import { prisma } from '../../lib/prisma.js';
import { listVisibleUsers } from '../auth/auth.service.js';
import { toUser, userSelect } from './user.mapper.js';

export const getMeHandler = defineRoute({}, async ({ user, res }) => {
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect });
  return sendData(res, toUser(row));
});

export const updateMeHandler = defineRoute(
  { body: updateProfileSchema },
  async ({ body, user, res }) => {
    const row = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
      select: userSelect,
    });

    return sendData(res, toUser(row));
  },
);

/**
 * Everyone the caller shares the current workspace with — the source for assignee
 * pickers. Deliberately scoped to the workspace so the endpoint is not a directory
 * of every NOVA account.
 */
export const listWorkspaceUsersHandler = defineRoute({}, async ({ workspace, res }) =>
  sendData(res, await listVisibleUsers(workspace.id)),
);
