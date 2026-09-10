'use client';

import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from '@nova/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Clock,
  Flag,
  FolderKanban,
  Pencil,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { LabelChip, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingPanel } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatDate, formatDateTime, formatDueDate, statusStyles } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { TaskComments } from './task-comments';
import { TaskFormDialog } from './task-form-dialog';

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-muted-foreground flex w-28 shrink-0 items-center gap-2 text-[12.5px]">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[13px]">{children}</span>
    </div>
  );
}

/**
 * The full task view.
 *
 * Rendered both inside the board's slide-over and as a standalone page, so a link
 * from a notification or the activity feed lands on the same thing the board shows.
 */
export function TaskDetail({
  taskId,
  onDeleted,
  initialTask,
}: {
  taskId: string;
  onDeleted?: () => void;
  initialTask?: Task;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const {
    data: task,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => endpoints.tasks.get(taskId),
    initialData: initialTask,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.all }),
    ]);
  };

  const changeStatus = useMutation({
    mutationFn: (status: TaskStatus) => endpoints.tasks.update(taskId, { status }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), updated);
      await invalidate();
      toast.success(`Moved to ${TASK_STATUS_LABELS[updated.status]}`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not update the task'),
  });

  const deleteTask = useMutation({
    mutationFn: () => endpoints.tasks.remove(taskId),
    onSuccess: async () => {
      setConfirmingDelete(false);
      await invalidate();
      toast.success('Task deleted');
      onDeleted?.();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not delete the task'),
  });

  if (isLoading && !task) return <LoadingPanel label="Loading task" />;

  if (isError || !task) {
    return (
      <ErrorState
        title="Task unavailable"
        message="This task may have been deleted, or it belongs to another workspace."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/projects/${task.project.id}`}
            className="bg-muted hover:bg-border inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium transition-colors"
          >
            <span
              className="size-2 rounded-[3px]"
              style={{ backgroundColor: task.project.color }}
              aria-hidden
            />
            {task.project.name}
          </Link>
          <span className="text-muted-foreground font-mono text-[11.5px]">{task.reference}</span>
          {task.isOverdue ? (
            <span className="bg-danger-subtle text-danger rounded-md px-2 py-0.5 text-[11.5px] font-semibold">
              Overdue
            </span>
          ) : null}
        </div>

        <h2
          className={cn(
            'text-xl leading-snug font-semibold tracking-tight',
            task.status === 'DONE' && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={task.status}
            onChange={(event) => changeStatus.mutate(event.target.value as TaskStatus)}
            disabled={changeStatus.isPending}
            aria-label="Task status"
            className="w-40"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>

          <span
            className={cn('h-1.5 w-16 rounded-full', statusStyles[task.status].bar)}
            aria-hidden
          />

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<Pencil />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete task"
              className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="border-border bg-muted/30 rounded-xl border px-4 py-2">
        <DetailRow icon={UserIcon} label="Assignee">
          {task.assignee ? (
            <span className="inline-flex items-center gap-2">
              <Avatar user={task.assignee} size="xs" />
              {task.assignee.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </DetailRow>

        <DetailRow icon={Flag} label="Priority">
          <PriorityBadge priority={task.priority} />
        </DetailRow>

        <DetailRow icon={CalendarDays} label="Due">
          <span className={task.isOverdue ? 'text-danger font-semibold' : undefined}>
            {formatDueDate(task.dueDate)}
          </span>
        </DetailRow>

        {task.estimateHours != null ? (
          <DetailRow icon={Clock} label="Estimate">
            {task.estimateHours} {task.estimateHours === 1 ? 'hour' : 'hours'}
          </DetailRow>
        ) : null}

        <DetailRow icon={FolderKanban} label="Created">
          <span className="text-muted-foreground">
            by {task.createdBy.name} on {formatDate(task.createdAt)}
          </span>
        </DetailRow>

        {task.completedAt ? (
          <DetailRow icon={Clock} label="Completed">
            <span className="text-success">{formatDateTime(task.completedAt)}</span>
          </DetailRow>
        ) : null}

        {task.labels.length > 0 ? (
          <DetailRow icon={Flag} label="Labels">
            <span className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <LabelChip key={label.id} name={label.name} color={label.color} />
              ))}
            </span>
          </DetailRow>
        ) : null}
      </div>

      {/* Description */}
      <section className="space-y-2">
        <h3 className="text-[13px] font-semibold">Description</h3>
        {task.description ? (
          <p className="text-muted-foreground text-[13.5px] leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        ) : (
          <p className="text-muted-foreground text-[13px] italic">
            No description yet. Use Edit to add the context whoever picks this up will need.
          </p>
        )}
      </section>

      <hr className="border-border" />

      <TaskComments taskId={task.id} />

      <TaskFormDialog open={editing} onClose={() => setEditing(false)} task={task} />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteTask.mutate()}
        loading={deleteTask.isPending}
        title={`Delete ${task.reference}?`}
        message="This removes the task and its comments for everyone. It cannot be undone."
        confirmLabel="Delete task"
      />
    </div>
  );
}
