'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, PageHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { useProjectOptions, useWorkspaceDirectory } from '@/hooks/use-workspace-data';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 30;

export default function ActivityPage() {
  const [projectId, setProjectId] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);

  const { data: projects = [] } = useProjectOptions();
  const { data: people = [] } = useWorkspaceDirectory();

  const filters = {
    projectId: projectId || undefined,
    actorId: actorId || undefined,
    page,
    pageSize: PAGE_SIZE,
  };

  useEffect(() => {
    setPage(1);
  }, [projectId, actorId]);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: queryKeys.activity.list(filters),
    queryFn: () => endpoints.activity.list(filters),
    placeholderData: keepPreviousData,
  });

  const pageInfo = data?.pageInfo;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="A complete record of what changed in this workspace, and who changed it."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          aria-label="Filter by project"
          className="w-52"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>

        <Select
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          aria-label="Filter by person"
          className="w-48"
        >
          <option value="">Everyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>

        {projectId || actorId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProjectId('');
              setActorId('');
            }}
          >
            Clear
          </Button>
        ) : null}

        {pageInfo ? (
          <span className="text-muted-foreground ml-auto text-[12.5px]">
            {pageInfo.total} {pageInfo.total === 1 ? 'event' : 'events'}
          </span>
        ) : null}
      </div>

      {isError ? (
        <ErrorState
          title="Could not load activity"
          message="The request to the API failed."
          onRetry={() => void refetch()}
        />
      ) : (
        <Card>
          <CardContent className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            <ActivityFeed
              activities={data?.items ?? []}
              loading={isLoading}
              emptyMessage={
                projectId || actorId
                  ? 'Nothing matches those filters yet.'
                  : 'As your team creates projects and moves tasks, the history builds up here.'
              }
            />
          </CardContent>

          {pageInfo && pageInfo.totalPages > 1 ? (
            <div className="border-border flex items-center justify-between border-t px-4 py-3">
              <p className="text-muted-foreground text-[12.5px]">
                Page {pageInfo.page} of {pageInfo.totalPages}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeft />}
                  disabled={!pageInfo.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Newer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pageInfo.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Older
                  <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
