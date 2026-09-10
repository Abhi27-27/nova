'use client';

import type { Activity } from '@nova/shared';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { describeActivity } from '@/lib/activity-text';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { History } from 'lucide-react';

export function ActivityFeed({
  activities,
  loading,
  compact = false,
  emptyMessage = 'Activity from your team will appear here as work moves.',
}: {
  activities: Activity[];
  loading?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-4">
        {Array.from({ length: compact ? 5 : 8 }).map((_, index) => (
          <li key={index} className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (activities.length === 0) {
    return <EmptyState icon={<History />} title="No activity yet" description={emptyMessage} />;
  }

  return (
    <ul className="relative space-y-1">
      {activities.map((activity, index) => {
        const description = describeActivity(activity);
        const Icon = description.icon;
        const isLast = index === activities.length - 1;

        return (
          <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* A connecting rail turns a list of events into a visible timeline. */}
            {!isLast ? (
              <span className="bg-border absolute top-9 bottom-0 left-4 w-px" aria-hidden />
            ) : null}

            <span className="relative shrink-0">
              <Avatar user={activity.actor} size="md" />
              <span
                className={cn(
                  'ring-card absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-2 [&_svg]:size-2.5',
                  description.tone,
                )}
              >
                <Icon aria-hidden />
              </span>
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-snug">
                <span className="font-semibold">{activity.actor.name}</span>{' '}
                <span className="text-muted-foreground">{description.text}</span>
              </p>

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
                <time dateTime={activity.createdAt}>{formatRelative(activity.createdAt)}</time>

                {activity.context.projectId ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/app/projects/${activity.context.projectId}`}
                      className="hover:text-foreground font-medium transition-colors"
                    >
                      {activity.context.projectName}
                    </Link>
                  </>
                ) : null}

                {activity.context.taskId && !compact ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/app/tasks/${activity.context.taskId}`}
                      className="hover:text-foreground truncate font-medium transition-colors"
                    >
                      {activity.context.taskTitle}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
