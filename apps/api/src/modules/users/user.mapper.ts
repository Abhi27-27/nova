import type { User as UserDto, UserSummary } from '@nova/shared';
import { Prisma } from '@prisma/client';

/**
 * Explicit projections.
 *
 * Every query that returns a user selects through one of these, which is what
 * guarantees `passwordHash` can never reach a response by accident.
 */
export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const userSelect = {
  ...userSummarySelect,
  jobTitle: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export function toUserSummary(row: UserSummaryRow): UserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatarUrl,
  };
}

export function toUser(row: UserRow): UserDto {
  return {
    ...toUserSummary(row),
    jobTitle: row.jobTitle,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
