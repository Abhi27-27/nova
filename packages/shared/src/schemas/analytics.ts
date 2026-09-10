import { z } from 'zod';
import { idSchema, paginationSchema } from './common.js';

export const dashboardQuerySchema = z.object({
  projectId: idSchema.optional(),
  /** Size of the throughput window in days. */
  days: z.coerce.number().int().min(7).max(180).default(30),
});

export const activityQuerySchema = paginationSchema.extend({
  projectId: idSchema.optional(),
  taskId: idSchema.optional(),
  actorId: idSchema.optional(),
});

export const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().default(false),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
