'use client';

import type { Project } from '@nova/shared';
import { AlertTriangle, CalendarDays, CheckCircle2, ListTodo } from 'lucide-react';
import Link from 'next/link';
import { AvatarGroup } from '@/components/ui/avatar';
import { ProjectStatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/feedback';
import { formatDueDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ProjectCard({ project }: { project: Project }) {
  const overdue = project.stats.overdue > 0;
  const dueSoon = project.dueDate ? new Date(project.dueDate).getTime() < Date.now() : false;

  return (
    <Link href={`/app/projects/${project.id}`} className="group block rounded-xl">
      <Card className="group-hover:shadow-raised h-full p-5 transition-all group-hover:-translate-y-0.5">
        {/* A colour rail identifies the project at a glance across every surface. */}
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[15px] leading-tight font-semibold">{project.name}</h3>
              <ProjectStatusBadge status={project.status} className="shrink-0" />
            </div>

            <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">{project.key}</p>
          </div>
        </div>

        <p className="text-muted-foreground mt-3 line-clamp-2 min-h-9 text-[13px] leading-relaxed">
          {project.description ?? 'No description yet.'}
        </p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">{project.stats.progress}%</span>
          </div>
          <Progress
            value={project.stats.progress}
            label={`${project.name} progress`}
            barClassName={project.stats.progress === 100 ? 'bg-success' : undefined}
          />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-[11.5px]">
          <div className="flex items-center gap-1.5">
            <ListTodo className="text-muted-foreground size-3.5" aria-hidden />
            <dt className="sr-only">Total tasks</dt>
            <dd className="font-medium tabular-nums">{project.stats.total}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="text-success size-3.5" aria-hidden />
            <dt className="sr-only">Completed</dt>
            <dd className="font-medium tabular-nums">{project.stats.completed}</dd>
          </div>
          <div className={cn('flex items-center gap-1.5', overdue && 'text-danger')}>
            <AlertTriangle
              className={cn('size-3.5', overdue ? 'text-danger' : 'text-muted-foreground')}
              aria-hidden
            />
            <dt className="sr-only">Overdue</dt>
            <dd className="font-medium tabular-nums">{project.stats.overdue}</dd>
          </div>
        </dl>

        <div className="border-border mt-4 flex items-center justify-between border-t pt-3.5">
          <AvatarGroup users={project.members.map((member) => member.user)} max={4} />

          {project.dueDate ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11.5px]',
                dueSoon && project.status !== 'COMPLETED'
                  ? 'text-danger font-semibold'
                  : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDueDate(project.dueDate)}
            </span>
          ) : (
            <span className="text-muted-foreground text-[11.5px]">No deadline</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
