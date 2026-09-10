import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

/**
 * Primitive building blocks reused across every request schema.
 * Everything is trimmed at the edge so `"  "` never reaches the database.
 */

export const idSchema = z.string().trim().min(1, 'Identifier is required');

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour such as #6366f1');

/** Accepts an ISO date string or `null`, and normalises `''` to `null`. */
export const nullableDateSchema = z
  .union([z.string().datetime({ offset: true }), z.string().date(), z.literal(''), z.null()])
  .transform((value) => (value === '' || value === null ? null : new Date(value).toISOString()))
  .nullable();

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Turns `?ids=a&ids=b` **and** `?ids=a,b` into `string[]`, which keeps the query
 * string ergonomic for hand-written cURL calls and for the web client alike.
 */
export const csvArraySchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : value.split(','))
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    )
    .pipe(z.array(item));

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Must be at least 2 characters')
  .max(48, 'Must be 48 characters or fewer')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');
