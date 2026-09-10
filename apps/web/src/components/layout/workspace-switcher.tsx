'use client';

import { WORKSPACE_ROLE_LABELS } from '@nova/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/workspace-provider';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/menu';
import { Modal } from '@/components/ui/modal';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface CreateWorkspaceValues {
  name: string;
  description: string;
}

export function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace, isLoading } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateWorkspaceValues>({ defaultValues: { name: '', description: '' } });

  const createWorkspace = useMutation({
    mutationFn: (values: CreateWorkspaceValues) =>
      endpoints.workspaces.create({
        name: values.name.trim(),
        description: values.description.trim() || null,
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      switchWorkspace(created.id);
      setCreating(false);
      form.reset();
      toast.success(`${created.name} is ready`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : 'Could not create the workspace',
      );
    },
  });

  if (isLoading && !workspace) {
    return <div className="skeleton h-12 rounded-lg" />;
  }

  if (!workspace) return null;

  return (
    <>
      <Menu
        align="start"
        className="w-60"
        trigger={
          <span
            className="border-border bg-background hover:bg-muted flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors"
            role="presentation"
          >
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-[12px] font-bold">
              {workspace.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-tight font-semibold">
                {workspace.name}
              </span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {WORKSPACE_ROLE_LABELS[workspace.role]} · {workspace.memberCount}{' '}
                {workspace.memberCount === 1 ? 'member' : 'members'}
              </span>
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          </span>
        }
      >
        <MenuLabel>Workspaces</MenuLabel>

        {workspaces.map((entry) => (
          <MenuItem
            key={entry.id}
            onClick={() => switchWorkspace(entry.id)}
            icon={
              <Check
                className={cn(
                  'transition-opacity',
                  entry.id === workspace.id ? 'opacity-100' : 'opacity-0',
                )}
              />
            }
          >
            <span className="flex flex-col">
              <span className="truncate">{entry.name}</span>
              <span className="text-muted-foreground text-[11px] font-normal">
                {WORKSPACE_ROLE_LABELS[entry.role]}
              </span>
            </span>
          </MenuItem>
        ))}

        <MenuSeparator />

        <MenuItem icon={<Plus />} onClick={() => setCreating(true)}>
          New workspace
        </MenuItem>
      </Menu>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a workspace"
        description="Workspaces keep projects, people and labels separate."
        size="sm"
        dismissOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit((values) => createWorkspace.mutate(values))}
              loading={createWorkspace.isPending}
            >
              Create workspace
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => createWorkspace.mutate(values))}
        >
          <Field
            label="Name"
            htmlFor="workspace-name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id="workspace-name"
              placeholder="Acme Product Team"
              autoFocus
              {...form.register('name', {
                required: 'Enter a workspace name',
                minLength: { value: 2, message: 'Use at least 2 characters' },
              })}
            />
          </Field>

          <Field label="Description" htmlFor="workspace-description">
            <Textarea
              id="workspace-description"
              rows={3}
              placeholder="What does this workspace cover?"
              {...form.register('description')}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
