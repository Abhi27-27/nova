'use client';

import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from '@nova/shared';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/form';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'dueDate' | 'createdAt'>('updatedAt');
  const [creating, setCreating] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);

  const filters = {
    search: debouncedSearch || undefined,
    status: status ? [status] : undefined,
    sortBy,
    sortOrder: sortBy === 'name' ? ('asc' as const) : ('desc' as const),
    pageSize: 60,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => endpoints.projects.list(filters),
  });

  const projects = data?.items ?? [];
  const isFiltered = Boolean(debouncedSearch || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every workstream in this workspace, with live progress."
        action={
          <Button icon={<Plus />} onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects…"
          leading={<Search />}
          className="w-full sm:w-72"
          aria-label="Search projects"
        />

        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as ProjectStatus | '')}
          aria-label="Filter by status"
          className="w-44"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {PROJECT_STATUS_LABELS[option]}
            </option>
          ))}
        </Select>

        <Select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          aria-label="Sort projects"
          className="w-44"
        >
          <option value="updatedAt">Recently updated</option>
          <option value="createdAt">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="dueDate">Due date</option>
        </Select>

        {!isLoading ? (
          <span className="text-muted-foreground ml-auto text-[12.5px]">
            {data?.pageInfo.total ?? 0} {data?.pageInfo.total === 1 ? 'project' : 'projects'}
          </span>
        ) : null}
      </div>

      {isError ? (
        <ErrorState
          title="Could not load projects"
          message="The request to the API failed."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban />}
          title={isFiltered ? 'No projects match those filters' : 'No projects yet'}
          description={
            isFiltered
              ? 'Try a different search term, or clear the status filter.'
              : 'Create your first project to start planning work with your team.'
          }
          action={
            isFiltered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button icon={<Plus />} onClick={() => setCreating(true)}>
                Create a project
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
