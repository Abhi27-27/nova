import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';
import { tokenTtl } from '../../lib/tokens.js';

export const ACCESS_TOKEN_COOKIE = 'nova_access_token';
export const REFRESH_TOKEN_COOKIE = 'nova_refresh_token';

/**
 * Tokens live in httpOnly cookies so that no XSS payload can read them from
 * JavaScript. The refresh cookie is additionally scoped to the auth path, which
 * keeps it out of every ordinary API request.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions(),
    maxAge: tokenTtl.accessMs,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions(),
    path: '/api/v1/auth',
    maxAge: tokenTtl.refreshMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseOptions() });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseOptions(), path: '/api/v1/auth' });
}
