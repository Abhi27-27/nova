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
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckSquare, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TaskDetail } from '@/components/tasks/task-detail';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskRow } from '@/components/tasks/task-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLabels, useProjectOptions, useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type Scope = 'me' | 'all' | 'created' | 'unassigned';

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'me', label: 'Assigned to me' },
  { id: 'all', label: 'All tasks' },
  { id: 'created', label: 'Created by me' },
  { id: 'unassigned', label: 'Unassigned' },
];

const PAGE_SIZE = 20;

export default function TasksPage() {
  const [scope, setScope] = useState<Scope>('me');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [projectId, setProjectId] = useState('');
  const [labelId, setLabelId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority' | 'updatedAt'>(
    'dueDate',
  );
  const [page, setPage] = useState(1);

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data: projects = [] } = useProjectOptions();
  const { data: people = [] } = useWorkspaceDirectory();
  const { data: labels = [] } = useLabels();

  const filters = {
    scope,
    search: debouncedSearch || undefined,
    status: status ? [status] : undefined,
    priority: priority ? [priority] : undefined,
    projectId: projectId || undefined,
    labelId: labelId ? [labelId] : undefined,
    assigneeId: scope === 'all' && assigneeId ? [assigneeId] : undefined,
    sortBy,
    sortOrder: sortBy === 'dueDate' ? ('asc' as const) : ('desc' as const),
    page,
    pageSize: PAGE_SIZE,
  };

  // Any change to the filters invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch, status, priority, projectId, labelId, assigneeId, sortBy]);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => endpoints.tasks.list(filters),
    // Keeping the previous page visible while the next one loads stops the list
    // collapsing to a spinner on every page change.
    placeholderData: keepPreviousData,
  });

  const tasks = data?.items ?? [];
  const pageInfo = data?.pageInfo;
  const filtersActive = Boolean(
    debouncedSearch || status || priority || projectId || labelId || assigneeId,
  );

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setProjectId('');
    setLabelId('');
    setAssigneeId('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Everything on your plate, across every project."
        action={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New task
          </Button>
        }
      />

      {/* Scope */}
      <div
        className="border-border flex flex-wrap gap-1 border-b"
        role="tablist"
        aria-label="Task scope"
      >
        {SCOPES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={scope === item.id}
            onClick={() => setScope(item.id)}
            className={cn(
              'border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
              scope === item.id
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles and descriptions…"
          leading={<Search />}
          className="w-full sm:w-64"
          aria-label="Search tasks"
        />

        <Select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          aria-label="Filter by project"
          className="w-44"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus | '')}
          aria-label="Filter by status"
          className="w-40"
        >
          <option value="">Any status</option>
          {TASK_STATUSES.map((option) => (
            <option key={option} value={option}>
              {TASK_STATUS_LABELS[option]}
            </option>
          ))}
        </Select>

        <Select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority | '')}
          aria-label="Filter by priority"
          className="w-40"
        >
          <option value="">Any priority</option>
          {TASK_PRIORITIES.map((option) => (
            <option key={option} value={option}>
              {TASK_PRIORITY_LABELS[option]}
            </option>
          ))}
        </Select>

        <Select
          value={labelId}
          onChange={(event) => setLabelId(event.target.value)}
          aria-label="Filter by label"
          className="w-36"
        >
          <option value="">Any label</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </Select>

        {scope === 'all' ? (
          <Select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            aria-label="Filter by assignee"
            className="w-40"
          >
            <option value="">Anyone</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          aria-label="Sort tasks"
          className="w-40"
        >
          <option value="dueDate">Due date</option>
          <option value="priority">Priority</option>
          <option value="createdAt">Newest first</option>
          <option value="updatedAt">Recently updated</option>
        </Select>

        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {/* Results */}
      {isError ? (
        <ErrorState
          title="Could not load tasks"
          message="The request to the API failed."
          onRetry={() => void refetch()}
        />
      ) : (
        <Card>
          <CardContent className={cn('p-2 transition-opacity', isPlaceholderData && 'opacity-60')}>
            {isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={<CheckSquare />}
                title={
                  filtersActive
                    ? 'No tasks match those filters'
                    : scope === 'me'
                      ? 'Nothing assigned to you'
                      : 'No tasks yet'
                }
                description={
                  filtersActive
                    ? 'Try clearing a filter to widen the results.'
                    : scope === 'me'
                      ? 'When a teammate assigns you work, it will show up here.'
                      : 'Create a task to get started.'
                }
                action={
                  filtersActive ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button icon={<Plus />} onClick={() => setCreating(true)}>
                      New task
                    </Button>
                  )
                }
              />
            ) : (
              <div className="divide-border divide-y">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={setOpenTask} />
                ))}
              </div>
            )}
          </CardContent>

          {pageInfo && pageInfo.totalPages > 1 ? (
            <div className="border-border flex items-center justify-between border-t px-4 py-3">
              <p className="text-muted-foreground text-[12.5px]">
                Page {pageInfo.page} of {pageInfo.totalPages} · {pageInfo.total} tasks
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeft />}
                  disabled={!pageInfo.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      <Modal open={Boolean(openTask)} onClose={() => setOpenTask(null)} size="lg">
        {openTask ? (
          <TaskDetail
            taskId={openTask.id}
            initialTask={openTask}
            onDeleted={() => setOpenTask(null)}
          />
        ) : null}
      </Modal>

      <TaskFormDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
