'use client';

import type { DashboardSummary } from '@nova/shared';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Workload per person.
 *
 * Bars are scaled against the busiest member rather than an absolute maximum, so
 * the comparison stays legible whether the team is carrying five tasks or fifty.
 */
export function WorkloadPanel({
  workload,
  loading,
}: {
  workload: DashboardSummary['workload'];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <ul className="space-y-3.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <li key={index} className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-full" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const active = workload.filter((entry) => entry.open + entry.completed + entry.overdue > 0);

  if (active.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="Nothing assigned yet"
        description="Assign tasks to teammates and their workload will show up here."
      />
    );
  }

  const peak = Math.max(...active.map((entry) => entry.open), 1);

  return (
    <ul className="space-y-4">
      {active.map((entry) => (
        <li key={entry.user.id} className="flex items-center gap-3">
          <Avatar user={entry.user} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[13px] font-medium">{entry.user.name}</p>
              <p className="text-muted-foreground shrink-0 text-[11.5px] tabular-nums">
                <span className="text-foreground font-semibold">{entry.open}</span> open
                {entry.overdue > 0 ? (
                  <span className="text-danger ml-1.5 font-semibold">{entry.overdue} late</span>
                ) : null}
              </p>
            </div>

            <div className="bg-muted mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              <span
                className={cn('h-full rounded-full transition-[width] duration-500', 'bg-primary')}
                style={{ width: `${((entry.open - entry.overdue) / peak) * 100}%` }}
              />
              {entry.overdue > 0 ? (
                <span
                  className="bg-danger h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(entry.overdue / peak) * 100}%` }}
                />
              ) : null}
            </div>

            <p className="text-muted-foreground mt-1 text-[11px]">{entry.completed} completed</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
