import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress, Skeleton } from '@/components/ui/feedback';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Optional supporting line, e.g. "of 128 tasks". */
  caption?: string;
  /** When present, renders a progress bar beneath the value. */
  progress?: number;
  loading?: boolean;
}

const tones = {
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
} as const;

const bars = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  caption,
  progress,
  loading,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-[12.5px] font-medium">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatNumber(value)}
            </p>
          )}
        </div>

        <span
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
      </div>

      {typeof progress === 'number' && !loading ? (
        <div className="mt-3.5 space-y-1.5">
          <Progress value={progress} barClassName={bars[tone]} label={`${label} progress`} />
          {caption ? <p className="text-muted-foreground text-[11.5px]">{caption}</p> : null}
        </div>
      ) : caption && !loading ? (
        <p className="text-muted-foreground mt-2 text-[11.5px]">{caption}</p>
      ) : null}
    </Card>
  );
}
