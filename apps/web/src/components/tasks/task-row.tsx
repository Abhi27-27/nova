'use client';

import type { Task } from '@nova/shared';
import { CalendarDays, MessageSquare } from 'lucide-react';
import { LabelChip, PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDueDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * One task as a horizontal row — used by list views and by the dashboard's
 * upcoming deadlines. The board uses `TaskCard` instead, which is the same data
 * arranged for a narrow column.
 */
export function TaskRow({
  task,
  onOpen,
  showProject = true,
  className,
}: {
  task: Task;
  onOpen?: (task: Task) => void;
  showProject?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors',
        'hover:border-border hover:bg-muted/60',
        className,
      )}
    >
      <span
        className="text-muted-foreground hidden w-16 shrink-0 font-mono text-[11px] sm:inline"
        title={task.project.name}
      >
        {task.reference}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-[13.5px] font-medium',
              task.status === 'DONE' && 'text-muted-foreground line-through',
            )}
          >
            {task.title}
          </span>
          {task.commentCount > 0 ? (
            <span className="text-muted-foreground inline-flex shrink-0 items-center gap-0.5 text-[11px]">
              <MessageSquare className="size-3" aria-hidden />
              {task.commentCount}
            </span>
          ) : null}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {showProject ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
              <span
                className="size-2 rounded-[3px]"
                style={{ backgroundColor: task.project.color }}
                aria-hidden
              />
              {task.project.name}
            </span>
          ) : null}

          {task.labels.slice(0, 2).map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
        </span>
      </span>

      {task.dueDate ? (
        <span
          className={cn(
            'hidden shrink-0 items-center gap-1 text-[11.5px] sm:inline-flex',
            task.isOverdue ? 'text-danger font-semibold' : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDueDate(task.dueDate)}
        </span>
      ) : null}

      <PriorityBadge priority={task.priority} className="hidden shrink-0 sm:inline-flex" />
      <StatusBadge status={task.status} className="hidden shrink-0 md:inline-flex" />

      <span className="shrink-0">
        {task.assignee ? (
          <Avatar user={task.assignee} size="sm" />
        ) : (
          <span
            className="border-border inline-block size-7 rounded-full border border-dashed"
            title="Unassigned"
            aria-label="Unassigned"
          />
        )}
      </span>
    </button>
  );
}
