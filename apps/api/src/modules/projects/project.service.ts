import {
  deriveProjectKey,
  type AddProjectMemberInput,
  type CreateProjectInput,
  type ListProjectsQuery,
  type ProjectRole,
  type ProjectStats,
  type TaskStatus,
  type UpdateProjectInput,
} from '@nova/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../lib/api-error.js';
import { paginate, toSkipTake } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import type { WorkspaceContext } from '../../types/express.js';
import { recordActivity } from '../activity/activity.service.js';
import { notify } from '../notifications/notification.service.js';
import { assertProjectAccess } from './project.access.js';
import {
  buildStats,
  emptyStats,
  projectInclude,
  projectMemberInclude,
  toProject,
  toProjectMember,
} from './project.mapper.js';

/**
 * Loads task rollups for many projects with two `groupBy` queries instead of one
 * query per project, which keeps `GET /projects` at constant query cost.
 */
async function loadStats(projectIds: string[]): Promise<Map<string, ProjectStats>> {
  const stats = new Map<string, ProjectStats>();
  if (projectIds.length === 0) return stats;

  const [byStatus, overdue] = await Promise.all([
    prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        status: { not: 'DONE' },
        dueDate: { lt: new Date() },
      },
      _count: { _all: true },
    }),
  ]);

  const grouped = new Map<string, { status: TaskStatus; count: number }[]>();
  for (const row of byStatus) {
    const entries = grouped.get(row.projectId) ?? [];
    entries.push({ status: row.status, count: row._count._all });
    grouped.set(row.projectId, entries);
  }

  const overdueByProject = new Map(overdue.map((row) => [row.projectId, row._count._all]));

  for (const projectId of projectIds) {
    stats.set(
      projectId,
      buildStats(grouped.get(projectId) ?? [], overdueByProject.get(projectId) ?? 0),
    );
  }

  return stats;
}

/** Finds a project key that is unique inside the workspace. */
async function resolveProjectKey(workspaceId: string, preferred: string): Promise<string> {
  const base = preferred.toUpperCase().slice(0, 6) || 'PRJ';

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 4)}${attempt + 1}`;
    const clash = await prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key: candidate } },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  throw ApiError.conflict('Could not allocate a unique project key — try a different name');
}

export async function listProjects(
  workspace: WorkspaceContext,
  userId: string,
  query: ListProjectsQuery,
) {
  const where: Prisma.ProjectWhereInput = { workspaceId: workspace.id };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { key: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status?.length) where.status = { in: query.status };
  if (query.memberId) where.members = { some: { userId: query.memberId } };

  const { skip, take } = toSkipTake(query.page, query.pageSize);

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ]);

  const stats = await loadStats(rows.map((row) => row.id));

  return paginate(
    rows.map((row) => toProject(row, stats.get(row.id) ?? emptyStats(), userId)),
    total,
    query.page,
    query.pageSize,
  );
}

export async function getProject(workspace: WorkspaceContext, userId: string, projectId: string) {
  await assertProjectAccess(workspace, userId, projectId, 'VIEWER');

  const row = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: projectInclude,
  });

  const stats = await loadStats([projectId]);
  return toProject(row, stats.get(projectId) ?? emptyStats(), userId);
}

export async function createProject(
  workspace: WorkspaceContext,
  userId: string,
  input: CreateProjectInput,
) {
  const key = await resolveProjectKey(workspace.id, input.key ?? deriveProjectKey(input.name));

  // Only real workspace members can be added, so a crafted payload cannot pull an
  // outsider into the project.
  const invitedIds = input.memberIds.filter((id) => id !== userId);
  const validMembers =
    invitedIds.length > 0
      ? await prisma.workspaceMember.findMany({
          where: { workspaceId: workspace.id, userId: { in: invitedIds } },
          select: { userId: true },
        })
      : [];

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: input.name,
      key,
      description: input.description ?? null,
      status: input.status,
      color: input.color,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdById: userId,
      members: {
        create: [
          { userId, role: 'LEAD' },
          ...validMembers.map((member) => ({ userId: member.userId, role: 'MEMBER' as const })),
        ],
      },
    },
    include: projectInclude,
  });

  await recordActivity({
    workspaceId: workspace.id,
    projectId: project.id,
    actorId: userId,
    type: 'PROJECT_CREATED',
    metadata: { name: project.name, key: project.key },
  });

  for (const member of validMembers) {
    await notify(
      {
        userId: member.userId,
        type: 'PROJECT_INVITE',
        title: `You were added to ${project.name}`,
        body: 'You now have access to this project board.',
        link: `/app/projects/${project.id}`,
      },
      { skipUserId: userId },
    );
  }

  return toProject(project, emptyStats(), userId);
}

export async function updateProject(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await assertProjectAccess(workspace, userId, projectId, 'LEAD');

  const data: Prisma.ProjectUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) {
    data.status = input.status;
    data.archivedAt = input.status === 'ARCHIVED' ? new Date() : null;
  }
  if (input.color !== undefined) data.color = input.color;
  if (input.startDate !== undefined)
    data.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
    include: projectInclude,
  });

  await recordActivity({
    workspaceId: workspace.id,
    projectId,
    actorId: userId,
    type: input.status === 'ARCHIVED' ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED',
    metadata: { name: project.name, changed: Object.keys(data) },
  });

  const stats = await loadStats([projectId]);
  return toProject(project, stats.get(projectId) ?? emptyStats(), userId);
}

export async function deleteProject(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
) {
  await assertProjectAccess(workspace, userId, projectId, 'LEAD');
  await prisma.project.delete({ where: { id: projectId } });
}

export async function listProjectMembers(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
) {
  await assertProjectAccess(workspace, userId, projectId, 'VIEWER');

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: projectMemberInclude,
    orderBy: { joinedAt: 'asc' },
  });

  return members.map(toProjectMember);
}

export async function addProjectMember(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
  input: AddProjectMemberInput,
) {
  const project = await assertProjectAccess(workspace, userId, projectId, 'LEAD');

  const inWorkspace = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: input.userId } },
    select: { id: true },
  });

  if (!inWorkspace) throw ApiError.badRequest('That person is not a member of this workspace');

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.userId } },
    select: { id: true },
  });

  if (existing) throw ApiError.conflict('That person is already on this project');

  const member = await prisma.projectMember.create({
    data: { projectId, userId: input.userId, role: input.role },
    include: projectMemberInclude,
  });

  await notify(
    {
      userId: input.userId,
      type: 'PROJECT_INVITE',
      title: `You were added to ${project.name}`,
      body: 'You now have access to this project board.',
      link: `/app/projects/${projectId}`,
    },
    { skipUserId: userId },
  );

  return toProjectMember(member);
}

export async function updateProjectMemberRole(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
  memberId: string,
  role: ProjectRole,
) {
  await assertProjectAccess(workspace, userId, projectId, 'LEAD');

  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
    select: { id: true },
  });

  if (!member) throw ApiError.notFound('Project member');

  const updated = await prisma.projectMember.update({
    where: { id: memberId },
    data: { role },
    include: projectMemberInclude,
  });

  return toProjectMember(updated);
}

export async function removeProjectMember(
  workspace: WorkspaceContext,
  userId: string,
  projectId: string,
  memberId: string,
) {
  await assertProjectAccess(workspace, userId, projectId, 'LEAD');

  const member = await prisma.projectMember.findFirst({
    where: { id: memberId, projectId },
    select: { id: true, role: true },
  });

  if (!member) throw ApiError.notFound('Project member');

  const leadCount = await prisma.projectMember.count({ where: { projectId, role: 'LEAD' } });
  if (member.role === 'LEAD' && leadCount <= 1) {
    throw ApiError.conflict('A project must keep at least one lead');
  }

  await prisma.projectMember.delete({ where: { id: memberId } });
}
