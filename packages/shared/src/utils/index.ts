import { TASK_PRIORITIES, type TaskPriority } from '../constants/enums.js';

/** URL-safe slug used for workspace addresses. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** Derives a project key such as `NOVA` from a project name. */
export function deriveProjectKey(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'PRJ';
  if (words.length === 1) return (words[0] ?? '').slice(0, 4).toUpperCase().padEnd(2, 'X');

  return words
    .slice(0, 4)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}

/** `NOVA-42` */
export function formatTaskReference(projectKey: string, taskNumber: number): string {
  return `${projectKey}-${taskNumber}`;
}

/** Two-letter avatar fallback, e.g. "Ada Lovelace" -> "AL". */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Completion percentage, rounded to a whole number and safe when `total` is 0. */
export function toPercentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(clamp((part / total) * 100, 0, 100));
}

export function isOverdue(dueDate: string | Date | null, isDone: boolean): boolean {
  if (!dueDate || isDone) return false;
  return new Date(dueDate).getTime() < Date.now();
}

/** Sort helper: URGENT first, LOW last. */
export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return TASK_PRIORITIES.indexOf(b) - TASK_PRIORITIES.indexOf(a);
}

/** Non-cryptographic deterministic colour picker for avatars and charts. */
export function pickColorFromString(input: string, palette: readonly string[]): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  const fallback = palette[0] ?? '#6366f1';
  return palette[Math.abs(hash) % palette.length] ?? fallback;
}
