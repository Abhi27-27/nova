import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/enums.js';
import {
  csvArraySchema,
  idSchema,
  nullableDateSchema,
  optionalTrimmedString,
  paginationSchema,
} from './common.js';

const nullableId = z
  .union([idSchema, z.literal(''), z.null()])
  .transform((value) => (value === '' || value === null ? null : value))
  .nullable();

export const createTaskSchema = z
  .object({
    projectId: idSchema,
    title: z.string().trim().min(2, 'Enter a task title').max(160),
    description: optionalTrimmedString(10000),
    status: z.enum(TASK_STATUSES).default('TODO'),
    priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
    assigneeId: nullableId.optional(),
    startDate: nullableDateSchema.optional(),
    dueDate: nullableDateSchema.optional(),
    estimateHours: z.coerce.number().min(0).max(1000).nullable().optional(),
    labelIds: z.array(idSchema).max(20).default([]),
  })
  .refine(
    (value) =>
      !value.startDate || !value.dueDate || new Date(value.startDate) <= new Date(value.dueDate),
    { message: 'The due date must fall on or after the start date', path: ['dueDate'] },
  );

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2, 'Enter a task title').max(160).optional(),
  description: optionalTrimmedString(10000),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: nullableId.optional(),
  startDate: nullableDateSchema.optional(),
  dueDate: nullableDateSchema.optional(),
  estimateHours: z.coerce.number().min(0).max(1000).nullable().optional(),
  labelIds: z.array(idSchema).max(20).optional(),
});

/**
 * Board drag-and-drop. The client sends the destination column plus the ids of the
 * cards that will sit either side of the dropped card; the server derives the new
 * fractional `position` from those neighbours, which keeps concurrent drags safe.
 */
export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  beforeTaskId: idSchema.nullish(),
  afterTaskId: idSchema.nullish(),
});

export const listTasksQuerySchema = paginationSchema.extend({
  projectId: idSchema.optional(),
  search: z.string().trim().max(120).optional(),
  status: csvArraySchema(z.enum(TASK_STATUSES)).optional(),
  priority: csvArraySchema(z.enum(TASK_PRIORITIES)).optional(),
  assigneeId: csvArraySchema(idSchema).optional(),
  labelId: csvArraySchema(idSchema).optional(),
  /** `me` is resolved server-side to the authenticated user. */
  scope: z.enum(['all', 'me', 'created', 'unassigned']).default('all'),
  dueBefore: z.string().datetime({ offset: true }).optional(),
  dueAfter: z.string().datetime({ offset: true }).optional(),
  overdue: z.coerce.boolean().optional(),
  includeDone: z.coerce.boolean().default(true),
  sortBy: z
    .enum(['position', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'title'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Board endpoint returns every column at once, so it opts out of pagination. */
export const boardQuerySchema = z.object({
  projectId: idSchema,
  search: z.string().trim().max(120).optional(),
  assigneeId: csvArraySchema(idSchema).optional(),
  priority: csvArraySchema(z.enum(TASK_PRIORITIES)).optional(),
  labelId: csvArraySchema(idSchema).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type BoardQuery = z.infer<typeof boardQuerySchema>;
