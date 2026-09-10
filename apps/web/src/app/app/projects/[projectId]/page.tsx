'use client';

import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@nova/shared';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  KanbanSquare,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { ProjectMembersPanel } from '@/components/projects/project-members-panel';
import { Board } from '@/components/tasks/board';
import { TaskDetail } from '@/components/tasks/task-detail';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { TaskRow } from '@/components/tasks/task-row';
import { AvatarGroup } from '@/components/ui/avatar';
import { ProjectStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingPanel, Progress } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLabels, useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { ApiClientError } from '@/lib/api-client';
import { endpoints } from '@/lib/endpoints';
import { formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type Tab = 'board' | 'list' | 'team';

const TABS: { id: Tab; label: string; icon: typeof KanbanSquare }[] = [
  { id: 'board', label: 'Board', icon: KanbanSquare },
  { id: 'list', label: 'List', icon: List },
  { id: 'team', label: 'Team', icon: Users },
];

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('board');
  const [search, setSearch] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [labelId, setLabelId] = useState('');

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data: people = [] } = useWorkspaceDirectory();
  const { data: labels = [] } = useLabels();

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => endpoints.projects.get(projectId),
  });

  const boardFilters = {
    search: debouncedSearch || undefined,
    assigneeId: assigneeId || undefined,
    priority: priority || undefined,
    labelId: labelId || undefined,
  };

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: queryKeys.tasks.board(projectId, boardFilters),
    queryFn: () => endpoints.tasks.board({ projectId, ...boardFilters }),
    enabled: Boolean(project),
  });

  const deleteProject = useMutation({
    mutationFn: () => endpoints.projects.remove(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      toast.success('Project deleted');
      router.push('/app/projects');
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : 'Could not delete the project'),
  });

  if (projectLoading) return <LoadingPanel label="Loading project" />;

  if (projectError || !project) {
    return (
      <ErrorState
        title="Project unavailable"
        message="This project may have been deleted, or it belongs to another workspace."
        onRetry={() => void refetchProject()}
      />
    );
  }

  const canManage = project.viewerRole === 'LEAD';
  const allTasks = board?.columns.flatMap((column) => column.tasks) ?? [];
  const filtersActive = Boolean(debouncedSearch || assigneeId || priority || labelId);

  return (
    <div className="space-y-5">
      <Link
        href="/app/projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All projects
      </Link>

      {/* Project header */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="mt-1 h-12 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
                <span className="text-muted-foreground font-mono text-[12px]">{project.key}</span>
              </div>

              {project.description ? (
                <p className="text-muted-foreground mt-1.5 max-w-3xl text-[13.5px] leading-relaxed">
                  {project.description}
                </p>
              ) : null}

              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  {project.startDate ? formatDate(project.startDate) : 'No start date'}
                  {' → '}
                  {project.dueDate ? formatDate(project.dueDate) : 'No due date'}
                </span>
                <span>Created by {project.createdBy.name}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <AvatarGroup users={project.members.map((member) => member.user)} max={5} size="md" />

              {canManage ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pencil />}
                    onClick={() => setEditingProject(true)}
                  >
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmingDelete(true)}
                    aria-label="Delete project"
                    className="text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                  >
                    <Trash2 />
                  </Button>
                </>
              ) : null}

              <Button icon={<Plus />} size="sm" onClick={() => setCreatingStatus('TODO')}>
                New task
              </Button>
            </div>
          </div>

          {/* Progress rollup */}
          <div className="border-border grid gap-4 border-t pt-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">
                  {project.stats.completed} of {project.stats.total} tasks complete
                </span>
                <span className="font-semibold tabular-nums">{project.stats.progress}%</span>
              </div>
              <Progress
                value={project.stats.progress}
                label="Project progress"
                barClassName={project.stats.progress === 100 ? 'bg-success' : undefined}
              />
            </div>

            <dl className="flex items-center gap-5 text-[12px]">
              <div>
                <dt className="text-muted-foreground">In progress</dt>
                <dd className="text-lg font-semibold tabular-nums">{project.stats.inProgress}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Overdue</dt>
                <dd
                  className={cn(
                    'text-lg font-semibold tabular-nums',
                    project.stats.overdue > 0 && 'text-danger',
                  )}
                >
                  {project.stats.overdue}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-border flex flex-wrap items-center gap-3 border-b">
        <nav className="flex gap-1" role="tablist" aria-label="Project views">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
                tab === item.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters (board and list only) */}
      {tab !== 'team' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter tasks…"
            leading={<Search />}
            className="w-full sm:w-60"
            aria-label="Filter tasks"
          />

          <Select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            aria-label="Filter by assignee"
            className="w-44"
          >
            <option value="">Anyone</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
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
            className="w-40"
          >
            <option value="">Any label</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </Select>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setAssigneeId('');
                setPriority('');
                setLabelId('');
              }}
            >
              Clear
            </Button>
          ) : null}

          <span className="text-muted-foreground ml-auto text-[12.5px]">
            {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      ) : null}

      {/* Views */}
      {tab === 'board' ? (
        <Board
          projectId={projectId}
          board={board}
          loading={boardLoading}
          filters={boardFilters}
          onOpenTask={setOpenTask}
          onCreateTask={(status) => setCreatingStatus(status)}
        />
      ) : null}

      {tab === 'list' ? (
        <Card>
          <CardContent className="p-2">
            {boardLoading ? (
              <LoadingPanel label="Loading tasks" />
            ) : allTasks.length === 0 ? (
              <EmptyState
                icon={<List />}
                title={filtersActive ? 'No tasks match those filters' : 'No tasks yet'}
                description={
                  filtersActive
                    ? 'Try clearing a filter to widen the results.'
                    : 'Add the first task and it will appear on the board.'
                }
                action={
                  !filtersActive ? (
                    <Button icon={<Plus />} onClick={() => setCreatingStatus('TODO')}>
                      Add a task
                    </Button>
                  ) : null
                }
              />
            ) : (
              <div className="divide-border divide-y">
                {allTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={setOpenTask} showProject={false} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'team' ? <ProjectMembersPanel project={project} /> : null}

      {/* Task detail slide-over */}
      <Modal open={Boolean(openTask)} onClose={() => setOpenTask(null)} size="lg">
        {openTask ? (
          <TaskDetail
            taskId={openTask.id}
            initialTask={openTask}
            onDeleted={() => setOpenTask(null)}
          />
        ) : null}
      </Modal>

      <TaskFormDialog
        open={creatingStatus !== null}
        onClose={() => setCreatingStatus(null)}
        defaultProjectId={projectId}
        defaultStatus={creatingStatus ?? 'TODO'}
      />

      <ProjectFormDialog
        open={editingProject}
        onClose={() => setEditingProject(false)}
        project={project}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => deleteProject.mutate()}
        loading={deleteProject.isPending}
        title={`Delete ${project.name}?`}
        message={`This permanently removes the project and all ${project.stats.total} of its tasks, comments and history. This cannot be undone.`}
        confirmLabel="Delete project"
      />
    </div>
  );
}
