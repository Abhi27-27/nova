'use client';

import type { AuthSession, User } from '@nova/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ApiClientError, AUTH_EXPIRED_EVENT, setActiveWorkspaceId } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';

interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  /** True only while the very first session check is in flight. */
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
    invitationToken?: string;
  }) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => endpoints.auth.session(),
    // A 401 here is the normal "signed out" answer, not a failure worth retrying.
    retry: false,
    staleTime: 60_000,
  });

  // Adopt the session's default workspace so the very first authenticated request
  // already carries a workspace header.
  useEffect(() => {
    if (session?.defaultWorkspace) {
      setActiveWorkspaceId(
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('nova.workspaceId') ?? session.defaultWorkspace.id)
          : session.defaultWorkspace.id,
      );
    }
  }, [session]);

  const clearSession = useCallback(() => {
    setActiveWorkspaceId(null);
    queryClient.clear();
  }, [queryClient]);

  // The API client announces an unrecoverable 401; the shell reacts to it here so
  // an expired session bounces to sign-in from anywhere in the app.
  useEffect(() => {
    const onExpired = () => {
      clearSession();
      if (pathname?.startsWith('/app')) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession, pathname, router]);

  const value = useMemo<AuthContextValue>(() => {
    const adopt = (next: AuthSession) => {
      queryClient.setQueryData(queryKeys.session, next);
      if (next.defaultWorkspace) setActiveWorkspaceId(next.defaultWorkspace.id);
      return next;
    };

    return {
      user: session?.user ?? null,
      session: session ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.user) && !isError,

      signIn: async (email, password) => adopt(await endpoints.auth.login({ email, password })),

      signUp: async (input) => adopt(await endpoints.auth.register(input)),

      signOut: async () => {
        try {
          await endpoints.auth.logout();
        } catch (error) {
          // A failed sign-out must still clear the client, otherwise the user is
          // stuck looking at a session they believe they ended.
          if (!(error instanceof ApiClientError)) throw error;
        } finally {
          clearSession();
          router.replace('/login');
        }
      },

      refreshSession: async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      },
    };
  }, [session, isLoading, isError, queryClient, clearSession, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
