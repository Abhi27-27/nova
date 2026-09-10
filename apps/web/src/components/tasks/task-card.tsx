'use client';

import type { Task } from '@nova/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, GripVertical, MessageSquare, Timer } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { LabelChip, PriorityBadge } from '@/components/ui/badge';
import { formatDueDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export function TaskCardContent({ task, dragging }: { task: Task; dragging?: boolean }) {
  return (
    <div
      className={cn(
        'border-border bg-card shadow-subtle space-y-2.5 rounded-xl border p-3 transition-shadow',
        dragging ? 'shadow-raised' : 'group-hover/card:shadow-card',
      )}
    >
      <div className="flex items-start gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 text-[13px] leading-snug font-medium',
            task.status === 'DONE' && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </p>
        <GripVertical
          className="text-muted-foreground/40 mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover/card:opacity-100"
          aria-hidden
        />
      </div>

      {task.labels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
          {task.labels.length > 3 ? (
            <span className="text-muted-foreground text-[10.5px]">+{task.labels.length - 3}</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-[10.5px]">{task.reference}</span>
        <PriorityBadge priority={task.priority} />

        <span className="ml-auto flex items-center gap-2">
          {task.commentCount > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-[10.5px]">
              <MessageSquare className="size-3" aria-hidden />
              {task.commentCount}
            </span>
          ) : null}
          {task.estimateHours != null ? (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-[10.5px]">
              <Timer className="size-3" aria-hidden />
              {task.estimateHours}h
            </span>
          ) : null}
          {task.assignee ? <Avatar user={task.assignee} size="xs" /> : null}
        </span>
      </div>

      {task.dueDate ? (
        <div
          className={cn(
            'border-border flex items-center gap-1 border-t pt-2 text-[10.5px]',
            task.isOverdue ? 'text-danger font-semibold' : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3" aria-hidden />
          {formatDueDate(task.dueDate)}
        </div>
      ) : null}
    </div>
  );
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group/card touch-none', isDragging && 'opacity-40')}
    >
      {/*
        The whole card is the drag handle, but a click that never moved should open
        the task. dnd-kit distinguishes the two for us: a click only fires when the
        pointer did not travel past the activation distance set on the sensor.

        The spread comes first so the handlers below win: pressing Enter on a
        focused card opens it rather than starting a keyboard drag. Keyboard users
        move a task between columns with the status picker in the detail panel,
        which is a far better experience than nudging a card with arrow keys.
      */}
      <div
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        onClick={() => onOpen(task)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(task);
          }
        }}
        aria-label={`${task.reference}: ${task.title}`}
        className="focus-visible:ring-ring cursor-grab rounded-xl outline-none focus-visible:ring-2 active:cursor-grabbing"
      >
        <TaskCardContent task={task} />
      </div>
    </div>
  );
}
