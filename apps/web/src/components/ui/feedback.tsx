'use client';

import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('text-muted-foreground size-4 animate-spin', className)} aria-hidden />
  );
}

/** Full-panel loading state used while a route's first query resolves. */
export function LoadingPanel({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-h-56 flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-6" />
      <p className="text-muted-foreground text-sm">{label}…</p>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty states say what the screen is for and offer the next step, rather than
 * leaving a blank rectangle that reads as a bug.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-[13px] leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this right now.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'border-danger/25 bg-danger-subtle/40 flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <div className="bg-danger-subtle text-danger flex size-11 items-center justify-center rounded-xl">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-[13px]">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Progress({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('bg-muted h-1.5 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          'bg-primary h-full rounded-full transition-[width] duration-500',
          barClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Lightweight tooltip built on the title-free pattern so it works on focus too. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap opacity-0 transition-opacity group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
