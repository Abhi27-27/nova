'use client';

import { WORKSPACE_ROLE_LABELS } from '@nova/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MailWarning, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingPanel } from '@/components/ui/feedback';
import { setActiveWorkspaceId } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

/**
 * Invitation landing page.
 *
 * The invitation is previewed without being consumed, so an anonymous visitor can
 * see who invited them and to what before deciding to create an account. Accepting
 * requires a signed-in user, and the sign-up link carries the token through.
 */
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const {
    data: invitation,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => endpoints.auth.previewInvitation(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => endpoints.auth.acceptInvitation(token),
    onSuccess: async (workspace) => {
      setActiveWorkspaceId(workspace.id);
      await queryClient.invalidateQueries();
      toast.success(`You have joined ${workspace.name}`);
      router.push('/app');
    },
    onError: () => toast.error('This invitation could not be accepted. It may have expired.'),
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Brand />
        <ThemeToggle />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-md">
          {isLoading || authLoading ? (
            <LoadingPanel label="Checking your invitation" />
          ) : isError || !invitation ? (
            <Card>
              <CardContent className="space-y-4 py-10 text-center">
                <div className="bg-danger-subtle text-danger mx-auto flex size-12 items-center justify-center rounded-xl">
                  <MailWarning className="size-6" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-lg font-semibold">This invitation is no longer valid</h1>
                  <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                    It may have expired, been revoked, or already been used. Ask whoever invited you
                    to send a fresh link.
                  </p>
                </div>
                <ButtonLink href="/login" variant="secondary">
                  Go to sign in
                </ButtonLink>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-5 py-8 text-center">
                <div className="bg-primary-subtle text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
                  <Users className="size-6" aria-hidden />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold tracking-tight">
                    Join {invitation.workspace.name}
                  </h1>
                  <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                    You have been invited as{' '}
                    <span className="text-foreground font-medium">
                      {WORKSPACE_ROLE_LABELS[invitation.role].toLowerCase()}
                    </span>
                    . This link expires on {formatDate(invitation.expiresAt)}.
                  </p>
                </div>

                <div className="bg-muted/60 flex items-center justify-center gap-2.5 rounded-lg px-4 py-3">
                  <Avatar user={invitation.invitedBy} size="sm" />
                  <p className="text-muted-foreground text-[12.5px]">
                    Invited by{' '}
                    <span className="text-foreground font-medium">{invitation.invitedBy.name}</span>
                  </p>
                </div>

                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      size="lg"
                      icon={<ArrowRight />}
                      onClick={() => accept.mutate()}
                      loading={accept.isPending}
                    >
                      Accept invitation
                    </Button>
                    <p className="text-muted-foreground text-[12px]">
                      Joining as {user?.email}
                      {user?.email !== invitation.email ? (
                        <>
                          {' '}
                          — this invite was addressed to{' '}
                          <span className="font-medium">{invitation.email}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ButtonLink
                      href={`/register?invitation=${encodeURIComponent(token)}`}
                      className="w-full"
                      size="lg"
                    >
                      Create an account to join
                    </ButtonLink>
                    <p className="text-muted-foreground text-[12.5px]">
                      Already have an account?{' '}
                      <a
                        href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Sign in
                      </a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
