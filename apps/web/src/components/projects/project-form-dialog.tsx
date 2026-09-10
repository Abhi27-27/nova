'use client';

import {
  COLOR_PALETTE,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  deriveProjectKey,
  type Project,
  type ProjectStatus,
} from '@nova/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface FormState {
  name: string;
  key: string;
  description: string;
  status: ProjectStatus;
  color: string;
  startDate: string;
  dueDate: string;
  memberIds: string[];
}

const EMPTY: FormState = {
  name: '',
  key: '',
  description: '',
  status: 'PLANNING',
  color: COLOR_PALETTE[0],
  startDate: '',
  dueDate: '',
  memberIds: [],
};

export function ProjectFormDialog({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
}) {
  const queryClient = useQueryClient();
  const { data: people = [] } = useWorkspaceDirectory();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Once the key is edited by hand it stops following the name. */
  const [keyTouched, setKeyTouched] = useState(false);

  const isEditing = Boolean(project);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setKeyTouched(Boolean(project));
    setForm(
      project
        ? {
            name: project.name,
            key: project.key,
            description: project.description ?? '',
            status: project.status,
            color: project.color,
            startDate: project.startDate?.slice(0, 10) ?? '',
            dueDate: project.dueDate?.slice(0, 10) ?? '',
            memberIds: project.members.map((member) => member.user.id),
          }
        : EMPTY,
    );
  }, [open, project]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onNameChange = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      key: keyTouched ? current.key : deriveProjectKey(name),
    }));
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiClientError && error.details) {
      setErrors(
        Object.fromEntries(
          Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? '']),
        ),
      );
      toast.error('Please check the highlighted fields');
    } else {
      toast.error(error instanceof ApiClientError ? error.message : 'Something went wrong');
    }
  };

  const asDate = (value: string) =>
    value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
    ]);

  const createProject = useMutation({
    mutationFn: () =>
      endpoints.projects.create({
        name: form.name.trim(),
        key: form.key.trim() || undefined,
        description: form.description.trim() || null,
        status: form.status,
        color: form.color,
        startDate: asDate(form.startDate),
        dueDate: asDate(form.dueDate),
        memberIds: form.memberIds,
      }),
    onSuccess: async (created) => {
      await invalidate();
      toast.success(`${created.name} created`);
      onClose();
    },
    onError: handleError,
  });

  const updateProject = useMutation({
    mutationFn: () =>
      endpoints.projects.update(project!.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        color: form.color,
        startDate: asDate(form.startDate),
        dueDate: asDate(form.dueDate),
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success('Project updated');
      onClose();
    },
    onError: handleError,
  });

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Enter a project name';
    if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
      nextErrors.dueDate = 'The due date must fall on or after the start date';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isEditing) updateProject.mutate();
    else createProject.mutate();
  };

  const pending = createProject.isPending || updateProject.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Project settings' : 'New project'}
      description={
        isEditing
          ? 'Update the details your team sees on the board and in reports.'
          : 'Group related work, invite the people involved and start planning.'
      }
      size="lg"
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending}>
            {isEditing ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Name" htmlFor="project-name" required error={errors.name}>
            <Input
              id="project-name"
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Apollo Web Platform"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>

          <Field
            label="Key"
            htmlFor="project-key"
            error={errors.key}
            description={isEditing ? undefined : 'Used in task ids'}
          >
            <Input
              id="project-key"
              value={form.key}
              onChange={(event) => {
                setKeyTouched(true);
                update('key', event.target.value.toUpperCase());
              }}
              placeholder="APL"
              maxLength={6}
              className="font-mono uppercase"
              invalid={Boolean(errors.key)}
              // The key is baked into every existing task reference, so it is fixed
              // once the project has been created.
              disabled={isEditing}
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="What is this project delivering, and for whom?"
            rows={3}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status" htmlFor="project-status">
            <Select
              id="project-status"
              value={form.status}
              onChange={(event) => update('status', event.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Start date" htmlFor="project-start">
            <Input
              id="project-start"
              type="date"
              value={form.startDate}
              onChange={(event) => update('startDate', event.target.value)}
            />
          </Field>

          <Field label="Due date" htmlFor="project-due" error={errors.dueDate}>
            <Input
              id="project-due"
              type="date"
              value={form.dueDate}
              onChange={(event) => update('dueDate', event.target.value)}
              invalid={Boolean(errors.dueDate)}
            />
          </Field>
        </div>

        <Field label="Colour">
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => update('color', color)}
                aria-label={`Use colour ${color}`}
                aria-pressed={form.color === color}
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg transition-transform hover:scale-110',
                  form.color === color && 'ring-ring ring-offset-card ring-2 ring-offset-2',
                )}
                style={{ backgroundColor: color }}
              >
                {form.color === color ? (
                  <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
        </Field>

        {!isEditing ? (
          <Field
            label="Team"
            description="You are added as the project lead. Members can be changed later."
          >
            <div className="flex flex-wrap gap-1.5">
              {people.map((person) => {
                const selected = form.memberIds.includes(person.id);

                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      update(
                        'memberIds',
                        selected
                          ? form.memberIds.filter((id) => id !== person.id)
                          : [...form.memberIds, person.id],
                      )
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-[12px] font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <Avatar user={person} size="xs" />
                    {person.name}
                  </button>
                );
              })}
            </div>
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}
