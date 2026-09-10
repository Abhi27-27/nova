import { z } from 'zod';
import { WORKSPACE_ROLES } from '../constants/enums.js';
import { emailSchema } from './auth.js';
import { optionalTrimmedString, slugSchema } from './common.js';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Enter a workspace name').max(60),
  slug: slugSchema.optional(),
  description: optionalTrimmedString(280),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

/** Owners cannot be created by invitation — ownership transfers are a separate action. */
export const invitableRoleSchema = z.enum(['ADMIN', 'MEMBER']);

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: invitableRoleSchema.default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES).refine((role) => role !== 'OWNER', {
    message: 'Use the transfer-ownership action to assign the OWNER role',
  }),
});

export const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
