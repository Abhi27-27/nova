import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment').max(5000),
});

export const updateCommentSchema = createCommentSchema;

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
