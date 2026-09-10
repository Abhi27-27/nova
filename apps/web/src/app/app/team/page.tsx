'use client';

import { WORKSPACE_ROLE_LABELS, type WorkspaceRole } from '@nova/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Crown, Mail, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { useWorkspace } from '@/components/workspace-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Field, Input, Select } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const ROLE_TONE: Record<WorkspaceRole, 'primary' | 'info' | 'neutral'> = {
  OWNER: 'primary',
  ADMIN: 'info',
  MEMBER: 'neutral',
};

export default function TeamPage() {
  const { user } = useAuth();
  const { workspace, can } = useWorkspace();
  const queryClient = useQueryClient();

  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const isAdmin = can('ADMIN');
  const isOwner = can('OWNER');

  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.workspaces.members(),
    queryFn: () => endpoints.workspaces.members(),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: queryKeys.workspaces.invitations(),
    queryFn: () => endpoints.workspaces.invitations(),
    enabled: isAdmin,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.users.directory() }),
    ]);

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiClientError ? error.message : 'Something went wrong');

  const invite = useMutation({
    mutationFn: () => endpoints.workspaces.invite({ email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: async (result) => {
      await refresh();
      setInviting(false);
      setInviteEmail('');

      if (result.kind === 'member') {
        toast.success(`${result.member.user.name} was added to the workspace`);
      } else {
        // There is no mail server in this deployment, so the link is handed back
        // for the inviter to share directly.
        void navigator.clipboard?.writeText(result.inviteUrl).catch(() => undefined);
        toast.success('Invitation created — the link is on your clipboard', {
          description: result.inviteUrl,
          duration: 8000,
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setInviteError(error.fieldError('email') ?? error.message);
      } else {
        setInviteError('Something went wrong');
      }
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: WorkspaceRole }) =>
      endpoints.workspaces.updateMemberRole(memberId, role),
    onSuccess: async () => {
      await refresh();
      toast.success('Role updated');
    },
    onError,
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => endpoints.workspaces.removeMember(memberId),
    onSuccess: async () => {
      setRemoving(null);
      await refresh();
      toast.success('Member removed');
    },
    onError,
  });

  const transferOwnership = useMutation({
    mutationFn: (memberId: string) => endpoints.workspaces.transferOwnership(memberId),
    onSuccess: async () => {
      await refresh();
      toast.success('Ownership transferred');
    },
    onError,
  });

  const revokeInvitation = useMutation({
    mutationFn: (invitationId: string) => endpoints.workspaces.revokeInvitation(invitationId),
    onSuccess: async () => {
      await refresh();
      toast.success('Invitation revoked');
    },
    onError,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`People with access to ${workspace?.name ?? 'this workspace'}.`}
        action={
          isAdmin ? (
            <Button
              icon={<UserPlus />}
              onClick={() => {
                setInviteError(null);
                setInviting(true);
              }}
            >
              Invite member
            </Button>
          ) : null
        }
      />

      {isError ? (
        <ErrorState
          title="Could not load the team"
          message="The request to the API failed."
          onRetry={() => void refetch()}
        />
      ) : (
        <Card>
          <CardHeader
            title="Members"
            description={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
          />

          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <EmptyState icon={<Users />} title="No members yet" />
            ) : (
              <ul className="divide-border divide-y">
                {members.map((member) => {
                  const isSelf = member.user.id === user?.id;

                  return (
                    <li key={member.id} className="flex flex-wrap items-center gap-3 py-3.5">
                      <Avatar user={member.user} size="lg" />

                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[14px] font-medium">
                          {member.user.name}
                          {isSelf ? (
                            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10.5px] font-medium">
                              You
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground truncate text-[12.5px]">
                          {member.user.email}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[11.5px]">
                          Joined {formatDate(member.joinedAt)}
                        </p>
                      </div>

                      {/* Owners cannot be demoted here; ownership moves via transfer. */}
                      {isAdmin && !isSelf && member.role !== 'OWNER' ? (
                        <Select
                          value={member.role}
                          onChange={(event) =>
                            changeRole.mutate({
                              memberId: member.id,
                              role: event.target.value as WorkspaceRole,
                            })
                          }
                          aria-label={`Role for ${member.user.name}`}
                          className="w-32"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </Select>
                      ) : (
                        <Badge tone={ROLE_TONE[member.role]}>
                          {member.role === 'OWNER' ? <Crown aria-hidden /> : null}
                          {WORKSPACE_ROLE_LABELS[member.role]}
                        </Badge>
                      )}

                      {isOwner && !isSelf && member.role !== 'OWNER' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Crown />}
                          onClick={() => transferOwnership.mutate(member.id)}
                          title="Make this person the workspace owner"
                        >
                          Transfer
                        </Button>
                      ) : null}

                      {isAdmin && !isSelf && member.role !== 'OWNER' ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setRemoving({ id: member.id, name: member.user.name })}
                          aria-label={`Remove ${member.user.name}`}
                          className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && invitations.length > 0 ? (
        <Card>
          <CardHeader
            title="Pending invitations"
            description="These people have been sent a link but have not joined yet."
          />
          <CardContent className="pt-2">
            <ul className="divide-border divide-y">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
                    <Mail className="size-4" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{invitation.email}</p>
                    <p className="text-muted-foreground text-[11.5px]">
                      Invited by {invitation.invitedBy.name} · expires{' '}
                      {formatDate(invitation.expiresAt)}
                    </p>
                  </div>

                  <Badge tone="neutral">{WORKSPACE_ROLE_LABELS[invitation.role]}</Badge>

                  {invitation.token ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy />}
                      onClick={() => {
                        const url = `${window.location.origin}/invite/${invitation.token}`;
                        void navigator.clipboard?.writeText(url);
                        toast.success('Invite link copied');
                      }}
                    >
                      Copy link
                    </Button>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => revokeInvitation.mutate(invitation.id)}
                    aria-label={`Revoke the invitation for ${invitation.email}`}
                    className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Invite dialog */}
      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        title="Invite someone"
        description="People who already have a NOVA account join straight away. Everyone else gets a link you can share."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              Cancel
            </Button>
            <Button onClick={() => invite.mutate()} loading={invite.isPending}>
              Send invitation
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate();
          }}
        >
          <Field
            label="Email address"
            htmlFor="invite-email"
            required
            error={inviteError ?? undefined}
          >
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value);
                setInviteError(null);
              }}
              placeholder="teammate@company.com"
              leading={<Mail />}
              invalid={Boolean(inviteError)}
              autoFocus
            />
          </Field>

          <Field
            label="Role"
            htmlFor="invite-role"
            description="Admins can manage members, projects and workspace settings."
          >
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as 'ADMIN' | 'MEMBER')}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMember.mutate(removing.id)}
        loading={removeMember.isPending}
        title={`Remove ${removing?.name ?? 'this member'}?`}
        message="They lose access to this workspace immediately. Tasks they were assigned stay in place but become unassigned."
        confirmLabel="Remove member"
      />
    </div>
  );
}
