'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PriorityChart, StatusBreakdown, ThroughputChart } from '@/components/dashboard/charts';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { StatCard } from '@/components/dashboard/stat-card';
import { WorkloadPanel } from '@/components/dashboard/workload-panel';
import { TaskRow } from '@/components/tasks/task-row';
import { Card, CardContent, CardHeader, PageHeader } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Select } from '@/components/ui/form';
import { ButtonLink } from '@/components/ui/button';
import { endpoints } from '@/lib/endpoints';
import { queryKeys } from '@/lib/query-keys';

const RANGES = [
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.analytics.dashboard({ days }),
    queryFn: () => endpoints.analytics.dashboard({ days }),
  });

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const totals = data?.totals;

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Good to see you, ${firstName}`} />
        <ErrorState
          title="We could not load your dashboard"
          message="The API did not respond. Check that the server is running, then try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Here is how your workspace is tracking right now."
        action={
          <>
            <Select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              aria-label="Reporting range"
              className="w-40"
            >
              {RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </Select>
            <ButtonLink href="/app/projects" icon={<FolderKanban />}>
              Projects
            </ButtonLink>
          </>
        }
      />

      {/* Headline numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active projects"
          value={totals?.activeProjects ?? 0}
          caption={`${totals?.projects ?? 0} in total`}
          icon={FolderKanban}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Tasks completed"
          value={totals?.completedTasks ?? 0}
          caption={`${data?.completionRate ?? 0}% of ${totals?.tasks ?? 0} tasks`}
          progress={data?.completionRate ?? 0}
          icon={CheckCircle2}
          tone="success"
          loading={isLoading}
        />
        <StatCard
          label="Open tasks"
          value={(totals?.tasks ?? 0) - (totals?.completedTasks ?? 0)}
          caption="Everything not yet done"
          icon={ListTodo}
          tone="info"
          loading={isLoading}
        />
        <StatCard
          label="Overdue"
          value={totals?.overdueTasks ?? 0}
          caption={
            (totals?.overdueTasks ?? 0) === 0
              ? 'Nothing past its due date'
              : 'Needs attention today'
          }
          icon={AlertTriangle}
          tone={(totals?.overdueTasks ?? 0) > 0 ? 'danger' : 'success'}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Throughput */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Created vs. completed"
            description="Whether the team is keeping pace with incoming work."
            action={
              <div className="text-muted-foreground flex items-center gap-3 text-[11.5px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-primary size-2 rounded-full" aria-hidden />
                  Created
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-success size-2 rounded-full" aria-hidden />
                  Completed
                </span>
              </div>
            }
          />
          <CardContent className="pt-4">
            <ThroughputChart data={data?.throughput ?? []} loading={isLoading} />
          </CardContent>
        </Card>

        {/* Status split */}
        <Card>
          <CardHeader title="Work by status" description="Where everything currently sits." />
          <CardContent className="pt-4">
            <StatusBreakdown data={data?.tasksByStatus ?? []} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Upcoming */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Coming up"
            description="The next deadlines across every project."
            action={
              <Link
                href="/app/tasks"
                className="text-primary inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline"
              >
                All tasks
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <CardContent className="pt-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : (data?.upcomingDeadlines.length ?? 0) === 0 ? (
              <EmptyState
                icon={<CalendarClock />}
                title="No deadlines ahead"
                description="Nothing is scheduled. Add a due date to a task to see it here."
              />
            ) : (
              <div className="-mx-1">
                {data?.upcomingDeadlines.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={() => router.push(`/app/tasks/${task.id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team workload */}
        <Card>
          <CardHeader
            title="Team workload"
            description="Open work per person, with anything late in red."
            action={
              <Link
                href="/app/team"
                className="text-primary inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline"
              >
                <Users className="size-3.5" aria-hidden />
                Team
              </Link>
            }
          />
          <CardContent className="pt-4">
            <WorkloadPanel workload={data?.workload ?? []} loading={isLoading} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Priority mix" description="How urgent the open work is." />
          <CardContent className="pt-4">
            <PriorityChart data={data?.tasksByPriority ?? []} loading={isLoading} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent activity"
            description="Who changed what, most recent first."
            action={
              <Link
                href="/app/activity"
                className="text-primary inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline"
              >
                Full history
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <CardContent className="pt-4">
            <ActivityFeed activities={data?.recentActivity ?? []} loading={isLoading} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
