'use client';

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type DashboardSummary,
  type TaskStatus,
} from '@nova/shared';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/feedback';
import { formatNumber } from '@/lib/format';

/**
 * Charts.
 *
 * Colours come from the same CSS custom properties as the rest of the UI — SVG
 * resolves `var(--primary)` natively — so the charts re-theme with everything
 * else instead of carrying a hard-coded palette that drifts in dark mode.
 */

const AXIS = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: ReactNode;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border-border bg-card shadow-raised rounded-lg border px-3 py-2">
      {label ? <p className="mb-1 text-[11.5px] font-semibold">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-[11.5px]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ThroughputChart({
  data,
  loading,
}: {
  data: DashboardSummary['throughput'];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;

  const series = data.map((point) => ({
    ...point,
    // A short label keeps the axis readable across a 30-day window.
    label: format(parseISO(point.date), 'd MMM'),
  }));

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          {...AXIS}
          // Thinning ticks avoids an unreadable, overlapping axis on wide ranges.
          interval={Math.max(0, Math.floor(series.length / 7) - 1)}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} {...AXIS} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />

        <Area
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#createdFill)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="var(--success)"
          strokeWidth={2}
          fill="url(#completedFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  BACKLOG: 'var(--status-backlog)',
  TODO: 'var(--status-todo)',
  IN_PROGRESS: 'var(--status-progress)',
  IN_REVIEW: 'var(--status-review)',
  DONE: 'var(--status-done)',
};

/**
 * Status distribution as a stacked bar rather than a pie: comparing five slices by
 * angle is hard, and a single bar also doubles as a progress read of the workload.
 */
export function StatusBreakdown({
  data,
  loading,
}: {
  data: DashboardSummary['tasksByStatus'];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-40 w-full" />;

  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-[13px]">
        No tasks yet — create one to see the breakdown.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
        {data
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <div
              key={entry.status}
              className="h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(entry.count / total) * 100}%`,
                backgroundColor: STATUS_COLOR[entry.status],
              }}
              title={`${TASK_STATUS_LABELS[entry.status]}: ${entry.count}`}
            />
          ))}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {data.map((entry) => (
          <li key={entry.status} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[entry.status] }}
              aria-hidden
            />
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-[12.5px]">
              {TASK_STATUS_LABELS[entry.status]}
            </span>
            <span className="text-[12.5px] font-semibold tabular-nums">
              {formatNumber(entry.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PRIORITY_COLOR = {
  LOW: 'var(--muted-foreground)',
  MEDIUM: 'var(--info)',
  HIGH: 'var(--warning)',
  URGENT: 'var(--danger)',
} as const;

export function PriorityChart({
  data,
  loading,
}: {
  data: DashboardSummary['tasksByPriority'];
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-52 w-full" />;

  const series = [...data]
    .reverse()
    .map((entry) => ({ ...entry, label: TASK_PRIORITY_LABELS[entry.priority] }));

  return (
    <ResponsiveContainer width="100%" height={208}>
      <BarChart data={series} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} {...AXIS} />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={64}
          {...AXIS}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="count" name="Tasks" radius={[0, 6, 6, 0]} barSize={18}>
          {series.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
