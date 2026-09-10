'use client';

import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@nova/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { LabelChip } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useLabels, useProjectOptions, useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface FormState {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  estimateHours: string;
  labelIds: string[];
}

const EMPTY: FormState = {
  projectId: '',
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  assigneeId: '',
  dueDate: '',
  estimateHours: '',
  labelIds: [],
};

/** `2026-09-10T00:00:00.000Z` -> `2026-09-10`, for a native date input. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Supply to edit; omit to create. */
  task?: Task | null;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
}

/**
 * One dialog for both creating and editing a task.
 *
 * Keeping them together means the two paths cannot drift apart — a field added to
 * creation is automatically editable, which is exactly the bug class that splitting
 * them tends to produce.
 */
export function TaskFormDialog({
  open,
  onClose,
  task,
  defaultProjectId,
  defaultStatus,
}: TaskFormDialogProps) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useProjectOptions();
  const { data: people = [] } = useWorkspaceDirectory();
  const { data: labels = [] } = useLabels();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setForm(
      task
        ? {
            projectId: task.project.id,
            title: task.title,
            description: task.description ?? '',
            status: task.status,
            priority: task.priority,
            assigneeId: task.assignee?.id ?? '',
            dueDate: toDateInput(task.dueDate),
            estimateHours: task.estimateHours != null ? String(task.estimateHours) : '',
            labelIds: task.labels.map((label) => label.id),
          }
        : {
            ...EMPTY,
            projectId: defaultProjectId ?? projects[0]?.id ?? '',
            status: defaultStatus ?? 'TODO',
          },
    );
  }, [open, task, defaultProjectId, defaultStatus, projects]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
    ]);
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiClientError) {
      if (error.details) {
        setErrors(
          Object.fromEntries(
            Object.entries(error.details).map(([field, messages]) => [field, messages[0] ?? '']),
          ),
        );
        toast.error('Please check the highlighted fields');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.error('Something went wrong. Please try again.');
    }
  };

  const payload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    assigneeId: form.assigneeId || null,
    dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00.000Z`).toISOString() : null,
    estimateHours: form.estimateHours ? Number(form.estimateHours) : null,
    labelIds: form.labelIds,
  });

  const createTask = useMutation({
    mutationFn: () => endpoints.tasks.create({ ...payload(), projectId: form.projectId }),
    onSuccess: async (created) => {
      await invalidate();
      toast.success(`${created.reference} created`);
      onClose();
    },
    onError: handleError,
  });

  const updateTask = useMutation({
    mutationFn: () => endpoints.tasks.update(task!.id, payload()),
    onSuccess: async (updated) => {
      await invalidate();
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      toast.success('Task updated');
      onClose();
    },
    onError: handleError,
  });

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.projectId) nextErrors.projectId = 'Choose a project';
    if (form.title.trim().length < 2) nextErrors.title = 'Enter a task title';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isEditing) updateTask.mutate();
    else createTask.mutate();
  };

  const pending = createTask.isPending || updateTask.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${task?.reference}` : 'New task'}
      description={
        isEditing
          ? 'Update the details and everyone sees the change.'
          : 'Add work to a project board.'
      }
      size="lg"
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending}>
            {isEditing ? 'Save changes' : 'Create task'}
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
        <Field label="Title" htmlFor="task-title" required error={errors.title}>
          <Input
            id="task-title"
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="What needs to happen?"
            invalid={Boolean(errors.title)}
            autoFocus
          />
        </Field>

        <Field label="Description" htmlFor="task-description" error={errors.description}>
          <Textarea
            id="task-description"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Context, acceptance criteria, links…"
            rows={4}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" htmlFor="task-project" required error={errors.projectId}>
            <Select
              id="task-project"
              value={form.projectId}
              onChange={(event) => update('projectId', event.target.value)}
              invalid={Boolean(errors.projectId)}
              // Moving a task between projects would break its reference number,
              // so the project is fixed once the task exists.
              disabled={isEditing}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Assignee" htmlFor="task-assignee">
            <Select
              id="task-assignee"
              value={form.assigneeId}
              onChange={(event) => update('assigneeId', event.target.value)}
            >
              <option value="">Unassigned</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="task-status">
            <Select
              id="task-status"
              value={form.status}
              onChange={(event) => update('status', event.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="task-priority">
            <Select
              id="task-priority"
              value={form.priority}
              onChange={(event) => update('priority', event.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Due date" htmlFor="task-due" error={errors['dueDate']}>
            <Input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(event) => update('dueDate', event.target.value)}
            />
          </Field>

          <Field label="Estimate (hours)" htmlFor="task-estimate">
            <Input
              id="task-estimate"
              type="number"
              min={0}
              max={1000}
              step={0.5}
              value={form.estimateHours}
              onChange={(event) => update('estimateHours', event.target.value)}
              placeholder="e.g. 4"
            />
          </Field>
        </div>

        <Field
          label="Labels"
          description={labels.length === 0 ? 'No labels yet — add some in Labels.' : undefined}
        >
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const selected = form.labelIds.includes(label.id);

              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    update(
                      'labelIds',
                      selected
                        ? form.labelIds.filter((id) => id !== label.id)
                        : [...form.labelIds, label.id],
                    )
                  }
                  className={cn(
                    'rounded-md border transition-all',
                    selected
                      ? 'border-primary ring-primary/20 ring-2'
                      : 'border-transparent opacity-65 hover:opacity-100',
                  )}
                >
                  <LabelChip name={label.name} color={label.color} />
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
