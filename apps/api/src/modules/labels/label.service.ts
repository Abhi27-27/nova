import type { CreateLabelInput, Label, UpdateLabelInput } from '@nova/shared';
import { ApiError } from '../../lib/api-error.js';
import { prisma } from '../../lib/prisma.js';

/** Labels are workspace-wide, so any project in the workspace can reuse them. */
export async function listLabels(workspaceId: string): Promise<Label[]> {
  const labels = await prisma.label.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { tasks: true } } },
  });

  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    workspaceId: label.workspaceId,
    taskCount: label._count.tasks,
  }));
}

export async function createLabel(workspaceId: string, input: CreateLabelInput): Promise<Label> {
  const existing = await prisma.label.findUnique({
    where: { workspaceId_name: { workspaceId, name: input.name } },
    select: { id: true },
  });

  if (existing) throw ApiError.conflict('A label with that name already exists');

  const label = await prisma.label.create({
    data: { workspaceId, name: input.name, color: input.color },
  });

  return { id: label.id, name: label.name, color: label.color, workspaceId, taskCount: 0 };
}

export async function updateLabel(
  workspaceId: string,
  labelId: string,
  input: UpdateLabelInput,
): Promise<Label> {
  const existing = await prisma.label.findFirst({
    where: { id: labelId, workspaceId },
    select: { id: true },
  });

  if (!existing) throw ApiError.notFound('Label');

  const label = await prisma.label.update({
    where: { id: labelId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    include: { _count: { select: { tasks: true } } },
  });

  return {
    id: label.id,
    name: label.name,
    color: label.color,
    workspaceId: label.workspaceId,
    taskCount: label._count.tasks,
  };
}

export async function deleteLabel(workspaceId: string, labelId: string): Promise<void> {
  const existing = await prisma.label.findFirst({
    where: { id: labelId, workspaceId },
    select: { id: true },
  });

  if (!existing) throw ApiError.notFound('Label');

  // `TaskLabel` cascades, so tasks simply lose the label rather than being blocked.
  await prisma.label.delete({ where: { id: labelId } });
}
