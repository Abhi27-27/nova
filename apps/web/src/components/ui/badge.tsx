import type { ProjectStatus, TaskPriority, TaskStatus } from '@nova/shared';
import type { HTMLAttributes, ReactNode } from 'react';
import {
  priorityLabel,
  priorityStyles,
  projectStatusLabel,
  projectStatusStyles,
  statusLabel,
  statusStyles,
} from '@/lib/format';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
}

export function Badge({ className, tone = 'neutral', icon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] leading-5 font-medium [&_svg]:size-3',
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] leading-5 font-medium',
        statusStyles[status].chip,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', statusStyles[status].dot)} aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] leading-5 font-medium',
        priorityStyles[priority].chip,
        className,
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] leading-5 font-medium',
        projectStatusStyles[status],
        className,
      )}
    >
      {projectStatusLabel(status)}
    </span>
  );
}

/** Coloured pill for a workspace label, tinted from the label's own colour. */
export function LabelChip({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] leading-5 font-medium',
        className,
      )}
      style={{
        // `color-mix` keeps the chip readable in both themes without needing a
        // second colour stored per label.
        backgroundColor: `color-mix(in oklch, ${color}, transparent 86%)`,
        color: `color-mix(in oklch, ${color}, var(--foreground) 22%)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {name}
    </span>
  );
}
