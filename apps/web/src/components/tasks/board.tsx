'use client';

import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type Task, type TaskStatus } from '@nova/shared';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/feedback';
import { ApiClientError } from '@/lib/api-client';
import { endpoints, type BoardResponse } from '@/lib/endpoints';
import { statusStyles } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { SortableTaskCard, TaskCardContent } from './task-card';

interface BoardProps {
  projectId: string;
  board: BoardResponse | undefined;
  loading?: boolean;
  filters: Record<string, unknown>;
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
}

function Column({
  status,
  tasks,
  onOpenTask,
  onCreateTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column', status } });

  return (
    <section
      className={cn(
        'border-border bg-muted/40 flex w-[286px] shrink-0 flex-col rounded-xl border transition-colors',
        isOver && 'border-primary/50 bg-primary-subtle/40',
      )}
      aria-label={TASK_STATUS_LABELS[status]}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn('size-2 rounded-full', statusStyles[status].dot)} aria-hidden />
        <h3 className="text-[12.5px] font-semibold">{TASK_STATUS_LABELS[status]}</h3>
        <span className="bg-card text-muted-foreground rounded px-1.5 text-[11px] font-medium tabular-nums">
          {tasks.length}
        </span>
        <button
          type="button"
          onClick={() => onCreateTask(status)}
          className="text-muted-foreground hover:bg-card hover:text-foreground ml-auto rounded-md p-1 transition-colors"
          aria-label={`Add a task to ${TASK_STATUS_LABELS[status]}`}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </header>

      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <button
            type="button"
            onClick={() => onCreateTask(status)}
            className="border-border text-muted-foreground hover:border-primary hover:text-primary flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-6 text-[12px] transition-colors"
          >
            Drop a card here, or add one
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The Kanban board.
 *
 * Moves are applied optimistically to the cached board so the card lands where it
 * was dropped immediately, then confirmed by the server. The request carries the
 * neighbouring card ids rather than an index, which is what lets two people
 * rearrange the same column at once without the result depending on who won a race.
 */
export function Board({
  projectId,
  board,
  loading,
  filters,
  onOpenTask,
  onCreateTask,
}: BoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const boardKey = queryKeys.tasks.board(projectId, filters);

  // An 8px threshold keeps a click a click: a card only starts dragging once the
  // pointer has actually travelled. There is deliberately no KeyboardSensor —
  // Enter on a card opens it, and keyboard users change a task's column with the
  // status picker in the detail panel, which is clearer than arrow-key nudging.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const byStatus = new Map<TaskStatus, Task[]>(
      TASK_STATUS_ORDER.map((status) => [status, [] as Task[]]),
    );

    for (const column of board?.columns ?? []) {
      byStatus.set(column.status, column.tasks);
    }

    return TASK_STATUS_ORDER.map((status) => ({ status, tasks: byStatus.get(status) ?? [] }));
  }, [board]);

  const moveTask = useMutation({
    mutationFn: ({
      taskId,
      status,
      beforeTaskId,
      afterTaskId,
    }: {
      taskId: string;
      status: TaskStatus;
      beforeTaskId: string | null;
      afterTaskId: string | null;
    }) => endpoints.tasks.move(taskId, { status, beforeTaskId, afterTaskId }),

    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Could not move the task');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const dragged = active.data.current?.task as Task | undefined;
    if (!dragged) return;

    // The drop target is either a column (empty space) or another card.
    const overData = over.data.current;
    const targetStatus: TaskStatus =
      overData?.type === 'column'
        ? (overData.status as TaskStatus)
        : ((overData?.task as Task | undefined)?.status ?? dragged.status);

    const source = columns.find((column) => column.status === dragged.status);
    const target = columns.find((column) => column.status === targetStatus);
    if (!source || !target) return;

    const withoutDragged = target.tasks.filter((task) => task.id !== dragged.id);

    let insertIndex: number;
    if (overData?.type === 'column') {
      insertIndex = withoutDragged.length;
    } else {
      const overIndex = withoutDragged.findIndex((task) => task.id === over.id);
      insertIndex = overIndex === -1 ? withoutDragged.length : overIndex;

      // Dragging downwards inside the same column means the card settles after the
      // one it was dropped onto, not before it.
      if (dragged.status === targetStatus) {
        const fromIndex = target.tasks.findIndex((task) => task.id === dragged.id);
        const toIndex = target.tasks.findIndex((task) => task.id === over.id);
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) insertIndex = overIndex + 1;
      }
    }

    const beforeTaskId = withoutDragged[insertIndex - 1]?.id ?? null;
    const afterTaskId = withoutDragged[insertIndex]?.id ?? null;

    if (dragged.status === targetStatus && beforeTaskId === null && afterTaskId === null) return;
    if (dragged.status === targetStatus && target.tasks[insertIndex]?.id === dragged.id) {
      return; // Dropped back where it started.
    }

    // Optimistic board update.
    const previous = queryClient.getQueryData<BoardResponse>(boardKey);

    queryClient.setQueryData<BoardResponse>(boardKey, (current) => {
      if (!current) return current;

      const moved: Task = { ...dragged, status: targetStatus };

      return {
        ...current,
        columns: current.columns.map((column) => {
          if (column.status === dragged.status && column.status === targetStatus) {
            const rest = column.tasks.filter((task) => task.id !== dragged.id);
            return {
              ...column,
              tasks: [...rest.slice(0, insertIndex), moved, ...rest.slice(insertIndex)],
            };
          }
          if (column.status === dragged.status) {
            return { ...column, tasks: column.tasks.filter((task) => task.id !== dragged.id) };
          }
          if (column.status === targetStatus) {
            const rest = column.tasks.filter((task) => task.id !== dragged.id);
            return {
              ...column,
              tasks: [...rest.slice(0, insertIndex), moved, ...rest.slice(insertIndex)],
            };
          }
          return column;
        }),
      };
    });

    moveTask.mutate(
      { taskId: dragged.id, status: targetStatus, beforeTaskId, afterTaskId },
      // Rolls the board back to the snapshot taken just above if the server refuses
      // the move — the toast comes from the mutation's own `onError`.
      { onError: () => queryClient.setQueryData(boardKey, previous) },
    );
  };

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-3">
        {TASK_STATUS_ORDER.map((status) => (
          <div key={status} className="bg-muted/40 w-[286px] shrink-0 space-y-2 rounded-xl p-2">
            <Skeleton className="h-6 w-28" />
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => (
          <Column
            key={column.status}
            status={column.status}
            tasks={column.tasks}
            onOpenTask={onOpenTask}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>

      {/* Follows the cursor so the card never disappears mid-drag. */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeTask ? (
          <div className="w-[270px] rotate-2">
            <TaskCardContent task={activeTask} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
