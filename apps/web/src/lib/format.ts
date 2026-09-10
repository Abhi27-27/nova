import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from '@nova/shared';
import {
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
} from 'date-fns';

/** Presentation helpers. Nothing here decides anything — it only phrases things. */

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return format(date, isThisYear(date) ? 'd MMM' : 'd MMM yyyy');
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return format(new Date(value), 'd MMM yyyy, HH:mm');
}

/** "Today", "Tomorrow", "3 Feb" — how a person would actually say a due date. */
export function formatDueDate(value: string | Date | null | undefined): string {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date);
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 45) return 'just now';
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function statusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status];
}

export function priorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority];
}

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status];
}

/** Tailwind classes per workflow status, resolved from the design tokens. */
export const statusStyles: Record<TaskStatus, { dot: string; chip: string; bar: string }> = {
  BACKLOG: {
    dot: 'bg-status-backlog',
    chip: 'bg-muted text-muted-foreground',
    bar: 'bg-status-backlog',
  },
  TODO: {
    dot: 'bg-status-todo',
    chip: 'bg-info-subtle text-info',
    bar: 'bg-status-todo',
  },
  IN_PROGRESS: {
    dot: 'bg-status-progress',
    chip: 'bg-warning-subtle text-warning',
    bar: 'bg-status-progress',
  },
  IN_REVIEW: {
    dot: 'bg-status-review',
    chip: 'bg-primary-subtle text-primary',
    bar: 'bg-status-review',
  },
  DONE: {
    dot: 'bg-status-done',
    chip: 'bg-success-subtle text-success',
    bar: 'bg-status-done',
  },
};

export const priorityStyles: Record<TaskPriority, { chip: string; text: string }> = {
  LOW: { chip: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
  MEDIUM: { chip: 'bg-info-subtle text-info', text: 'text-info' },
  HIGH: { chip: 'bg-warning-subtle text-warning', text: 'text-warning' },
  URGENT: { chip: 'bg-danger-subtle text-danger', text: 'text-danger' },
};

export const projectStatusStyles: Record<ProjectStatus, string> = {
  PLANNING: 'bg-info-subtle text-info',
  ACTIVE: 'bg-success-subtle text-success',
  ON_HOLD: 'bg-warning-subtle text-warning',
  COMPLETED: 'bg-primary-subtle text-primary',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

/** Deterministic avatar tint, so a person keeps the same colour everywhere. */
const AVATAR_TINTS = [
  'bg-[oklch(0.62_0.16_20)]',
  'bg-[oklch(0.62_0.16_60)]',
  'bg-[oklch(0.6_0.15_120)]',
  'bg-[oklch(0.6_0.14_170)]',
  'bg-[oklch(0.6_0.15_220)]',
  'bg-[oklch(0.58_0.18_275)]',
  'bg-[oklch(0.6_0.18_320)]',
];

export function avatarTint(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length] ?? AVATAR_TINTS[0]!;
}
