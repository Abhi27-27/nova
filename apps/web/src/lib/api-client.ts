import type { ApiResponse } from '@nova/shared';

/**
 * The single door to the API.
 *
 * Everything the rest of the app needs from HTTP lives here: the response
 * envelope is unwrapped, failures become a typed `ApiClientError`, the active
 * workspace is attached to every request, and an expired access token is
 * transparently refreshed once before the caller ever sees a 401.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/$/,
  '',
);

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, string[]> | undefined;
  readonly requestId: string | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** First message for a field, for wiring server-side validation into a form. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

// ---------------------------------------------------------------------------
// Active workspace
// ---------------------------------------------------------------------------

let activeWorkspaceId: string | null = null;

export function setActiveWorkspaceId(workspaceId: string | null): void {
  activeWorkspaceId = workspaceId;
  if (typeof window !== 'undefined') {
    if (workspaceId) window.localStorage.setItem('nova.workspaceId', workspaceId);
    else window.localStorage.removeItem('nova.workspaceId');
  }
}

export function getActiveWorkspaceId(): string | null {
  if (activeWorkspaceId) return activeWorkspaceId;
  if (typeof window === 'undefined') return null;
  activeWorkspaceId = window.localStorage.getItem('nova.workspaceId');
  return activeWorkspaceId;
}

/** Broadcast when the session cannot be recovered, so the shell can redirect. */
export const AUTH_EXPIRED_EVENT = 'nova:auth-expired';

function announceSessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

// ---------------------------------------------------------------------------
// Refresh coordination
// ---------------------------------------------------------------------------

/**
 * A page load can fire a dozen queries at once. Without this, an expired token
 * would trigger a dozen simultaneous refreshes — and because refresh tokens
 * rotate, all but one would be treated as a replay and revoke the session. So
 * concurrent callers share a single in-flight refresh.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this promise all see the
      // same result before a new refresh can start.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
  /** Set to skip the automatic refresh-and-retry (used by the auth endpoints). */
  skipRefresh?: boolean;
}

/**
 * Serialises the query string. Arrays are joined with commas, which is the form
 * the API's `csvArraySchema` accepts, and empty values are dropped so a cleared
 * filter disappears from the URL instead of being sent as `""`.
 */
function buildUrl(path: string, query?: RequestOptions['query']): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }

  const queryString = search.toString();
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return queryString ? `${url}?${queryString}` : url;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const requestId = response.headers.get('x-request-id') ?? undefined;
  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && payload.success === false ? payload.error : null;
    throw new ApiClientError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'We could not reach the NOVA API. Check your connection and try again.',
      error?.details,
      error?.requestId ?? requestId,
    );
  }

  return payload.data;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipRefresh, headers, ...rest } = options;

  const send = async (): Promise<Response> => {
    const workspaceId = getActiveWorkspaceId();

    return fetch(buildUrl(path, query), {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(workspaceId ? { 'X-Workspace-Id': workspaceId } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };

  let response: Response;

  try {
    response = await send();
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'We could not reach the NOVA API. Check that the server is running and try again.',
    );
  }

  if (response.status === 401 && !skipRefresh) {
    const recovered = await refreshSession();

    if (!recovered) {
      announceSessionExpired();
      return parse<T>(response);
    }

    response = await send();
  }

  return parse<T>(response);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
