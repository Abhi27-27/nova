import type { WorkspaceRole } from '@nova/shared';

/** The signed-in principal, resolved once per request by `authenticate`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/** The tenant the request operates inside, resolved by `workspaceContext`. */
export interface WorkspaceContext {
  id: string;
  name: string;
  slug: string;
  /** The requesting user's role in this workspace. */
  role: WorkspaceRole;
  membershipId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      workspace?: WorkspaceContext;
    }
  }
}

export {};
