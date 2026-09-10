export * from './enums.js';

/** Product identity — used by the API (OpenAPI metadata) and the web app (branding). */
export const APP_NAME = 'NOVA';
export const APP_TAGLINE = 'Plan. Collaborate. Deliver.';
export const APP_DESCRIPTION =
  'NOVA is a project management platform for teams to manage projects, tasks, members and productivity from a single application.';

/** Pagination defaults shared by every list endpoint. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Spacing used when re-ordering board cards with fractional indexes. */
export const POSITION_STEP = 1024;

/** Palette offered when creating projects and labels. */
export const COLOR_PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#64748b',
] as const;
