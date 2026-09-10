'use client';

import { changePasswordSchema, updateProfileSchema } from '@nova/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Save, ShieldAlert, Trash2, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { useWorkspace } from '@/components/workspace-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, PageHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';

function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const capture = (error: unknown, fallback: string) => {
    if (error instanceof ApiClientError && error.details) {
      setErrors(
        Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? '']),
        ),
      );
      toast.error('Please check the highlighted fields');
    } else {
      toast.error(error instanceof ApiClientError ? error.message : fallback);
    }
  };

  return { errors, setErrors, capture };
}

export default function SettingsPage() {
  const { user, refreshSession, signOut } = useAuth();
  const { workspace, can } = useWorkspace();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({ name: '', jobTitle: '', timezone: '', avatarUrl: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', description: '' });
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const profileErrors = useFieldErrors();
  const passwordErrors = useFieldErrors();
  const workspaceErrors = useFieldErrors();

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        jobTitle: user.jobTitle ?? '',
        timezone: user.timezone ?? '',
        avatarUrl: user.avatarUrl ?? '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (workspace) {
      setWorkspaceForm({ name: workspace.name, description: workspace.description ?? '' });
    }
  }, [workspace]);

  const saveProfile = useMutation({
    mutationFn: () => {
      // Validating with the same schema the API uses means the two can never
      // disagree about what a valid profile looks like.
      const parsed = updateProfileSchema.parse({
        name: profile.name,
        jobTitle: profile.jobTitle,
        timezone: profile.timezone,
        avatarUrl: profile.avatarUrl,
      });
      return endpoints.users.updateMe(parsed);
    },
    onSuccess: async () => {
      profileErrors.setErrors({});
      await refreshSession();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Profile updated');
    },
    onError: (error) => profileErrors.capture(error, 'Could not update your profile'),
  });

  const changePassword = useMutation({
    mutationFn: () => endpoints.auth.changePassword(changePasswordSchema.parse(passwords)),
    onSuccess: () => {
      passwordErrors.setErrors({});
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password changed', {
        description: 'Every other device has been signed out.',
      });
    },
    onError: (error) => passwordErrors.capture(error, 'Could not change your password'),
  });

  const saveWorkspace = useMutation({
    mutationFn: () =>
      endpoints.workspaces.update({
        name: workspaceForm.name.trim(),
        description: workspaceForm.description.trim() || null,
      }),
    onSuccess: async () => {
      workspaceErrors.setErrors({});
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      toast.success('Workspace updated');
    },
    onError: (error) => workspaceErrors.capture(error, 'Could not update the workspace'),
  });

  const deleteWorkspace = useMutation({
    mutationFn: () => endpoints.workspaces.remove(),
    onSuccess: async () => {
      setConfirmingDelete(false);
      toast.success('Workspace deleted');
      // The active workspace just disappeared, so the safest reset is a reload
      // into whatever workspace the user still belongs to.
      window.localStorage.removeItem('nova.workspaceId');
      window.location.href = '/app';
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : 'Could not delete the workspace',
      ),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your profile, security and workspace." />

      {/* Profile */}
      <Card>
        <CardHeader
          title="Profile"
          description="How you appear to everyone else in the workspace."
        />
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <Avatar
              user={{
                id: user.id,
                name: profile.name || user.name,
                avatarUrl: profile.avatarUrl || null,
              }}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <Field
                label="Avatar URL"
                htmlFor="avatar"
                error={profileErrors.errors.avatarUrl}
                description="Paste a link to an image, or leave blank to use your initials."
              >
                <Input
                  id="avatar"
                  value={profile.avatarUrl}
                  onChange={(event) => setProfile((c) => ({ ...c, avatarUrl: event.target.value }))}
                  placeholder="https://…"
                  invalid={Boolean(profileErrors.errors.avatarUrl)}
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" required error={profileErrors.errors.name}>
              <Input
                id="name"
                value={profile.name}
                onChange={(event) => setProfile((c) => ({ ...c, name: event.target.value }))}
                invalid={Boolean(profileErrors.errors.name)}
              />
            </Field>

            <Field label="Email" htmlFor="email" description="Contact an admin to change this.">
              <Input id="email" value={user.email} disabled />
            </Field>

            <Field label="Job title" htmlFor="jobTitle" error={profileErrors.errors.jobTitle}>
              <Input
                id="jobTitle"
                value={profile.jobTitle}
                onChange={(event) => setProfile((c) => ({ ...c, jobTitle: event.target.value }))}
                placeholder="Product Designer"
              />
            </Field>

            <Field label="Timezone" htmlFor="timezone" error={profileErrors.errors.timezone}>
              <Input
                id="timezone"
                value={profile.timezone}
                onChange={(event) => setProfile((c) => ({ ...c, timezone: event.target.value }))}
                placeholder="Asia/Kolkata"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button
              icon={<Save />}
              onClick={() => saveProfile.mutate()}
              loading={saveProfile.isPending}
            >
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader
          title="Password"
          description="Changing your password signs you out on every other device."
        />
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Current password"
              htmlFor="currentPassword"
              required
              error={passwordErrors.errors.currentPassword}
            >
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) =>
                  setPasswords((c) => ({ ...c, currentPassword: event.target.value }))
                }
                leading={<KeyRound />}
                invalid={Boolean(passwordErrors.errors.currentPassword)}
              />
            </Field>

            <Field
              label="New password"
              htmlFor="newPassword"
              required
              error={passwordErrors.errors.newPassword}
              description="8+ characters with upper, lower and a number."
            >
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={(event) =>
                  setPasswords((c) => ({ ...c, newPassword: event.target.value }))
                }
                leading={<KeyRound />}
                invalid={Boolean(passwordErrors.errors.newPassword)}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => changePassword.mutate()}
              loading={changePassword.isPending}
              disabled={!passwords.currentPassword || !passwords.newPassword}
            >
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      {workspace ? (
        <Card>
          <CardHeader
            title="Workspace"
            description={
              can('ADMIN')
                ? 'Visible to everyone in this workspace.'
                : 'Only admins can change these details.'
            }
          />
          <CardContent className="space-y-4 pt-4">
            <Field label="Name" htmlFor="workspace-name" error={workspaceErrors.errors.name}>
              <Input
                id="workspace-name"
                value={workspaceForm.name}
                onChange={(event) => setWorkspaceForm((c) => ({ ...c, name: event.target.value }))}
                disabled={!can('ADMIN')}
                invalid={Boolean(workspaceErrors.errors.name)}
              />
            </Field>

            <Field label="Description" htmlFor="workspace-description">
              <Textarea
                id="workspace-description"
                rows={3}
                value={workspaceForm.description}
                onChange={(event) =>
                  setWorkspaceForm((c) => ({ ...c, description: event.target.value }))
                }
                disabled={!can('ADMIN')}
              />
            </Field>

            <dl className="bg-muted/50 grid grid-cols-3 gap-4 rounded-lg p-3 text-center">
              <div>
                <dt className="text-muted-foreground text-[11.5px]">Members</dt>
                <dd className="text-lg font-semibold tabular-nums">{workspace.memberCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11.5px]">Projects</dt>
                <dd className="text-lg font-semibold tabular-nums">{workspace.projectCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11.5px]">Your role</dt>
                <dd className="text-lg font-semibold capitalize">{workspace.role.toLowerCase()}</dd>
              </div>
            </dl>

            {can('ADMIN') ? (
              <div className="flex justify-end">
                <Button
                  icon={<Save />}
                  onClick={() => saveWorkspace.mutate()}
                  loading={saveWorkspace.isPending}
                >
                  Save workspace
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Danger zone */}
      <Card className="border-danger/30">
        <CardHeader
          title={
            <span className="text-danger flex items-center gap-2">
              <ShieldAlert className="size-4" aria-hidden />
              Danger zone
            </span>
          }
          description="These actions cannot be undone."
        />
        <CardContent className="space-y-3 pt-4">
          <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-[13px] font-medium">Sign out of this device</p>
              <p className="text-muted-foreground text-[12px]">
                Ends the session in this browser only.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<UserIcon />}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>

          {can('OWNER') ? (
            <div className="border-danger/30 bg-danger-subtle/30 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-[13px] font-medium">Delete this workspace</p>
                <p className="text-muted-foreground text-[12px]">
                  Permanently removes every project, task and comment in {workspace?.name}.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete workspace
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteWorkspace.mutate()}
        loading={deleteWorkspace.isPending}
        title={`Delete ${workspace?.name ?? 'this workspace'}?`}
        message="Every project, task, comment and piece of history in this workspace is permanently deleted for everyone. This cannot be undone."
        confirmLabel="Delete workspace"
      />
    </div>
  );
}
