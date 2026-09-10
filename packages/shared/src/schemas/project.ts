import { z } from 'zod';
import { PROJECT_ROLES, PROJECT_STATUSES } from '../constants/enums.js';
import {
  csvArraySchema,
  hexColorSchema,
  idSchema,
  nullableDateSchema,
  optionalTrimmedString,
  paginationSchema,
} from './common.js';

/** Short uppercase prefix used to build task references such as `NOVA-42`. */
export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Use at least 2 characters')
  .max(6, 'Use 6 characters or fewer')
  .regex(/^[A-Z][A-Z0-9]*$/, 'Start with a letter and use only letters and numbers');

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a project name').max(80),
    key: projectKeySchema.optional(),
    description: optionalTrimmedString(1000),
    status: z.enum(PROJECT_STATUSES).default('PLANNING'),
    color: hexColorSchema.default('#6366f1'),
    startDate: nullableDateSchema.optional(),
    dueDate: nullableDateSchema.optional(),
    memberIds: z.array(idSchema).max(50).default([]),
  })
  .refine(
    (value) =>
      !value.startDate || !value.dueDate || new Date(value.startDate) <= new Date(value.dueDate),
    { message: 'The due date must fall on or after the start date', path: ['dueDate'] },
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a project name').max(80).optional(),
    description: optionalTrimmedString(1000),
    status: z.enum(PROJECT_STATUSES).optional(),
    color: hexColorSchema.optional(),
    startDate: nullableDateSchema.optional(),
    dueDate: nullableDateSchema.optional(),
  })
  .refine(
    (value) =>
      !value.startDate || !value.dueDate || new Date(value.startDate) <= new Date(value.dueDate),
    { message: 'The due date must fall on or after the start date', path: ['dueDate'] },
  );

export const listProjectsQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: csvArraySchema(z.enum(PROJECT_STATUSES)).optional(),
  memberId: idSchema.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'dueDate']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const addProjectMemberSchema = z.object({
  userId: idSchema,
  role: z.enum(PROJECT_ROLES).default('MEMBER'),
});

export const updateProjectMemberSchema = z.object({
  role: z.enum(PROJECT_ROLES),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
