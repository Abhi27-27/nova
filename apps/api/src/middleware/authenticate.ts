import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../lib/api-error.js';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.cookies.js';

/**
 * Reads the access token from the httpOnly cookie, falling back to an
 * `Authorization: Bearer` header so the API stays usable from cURL, Postman and
 * the OpenAPI explorer without a browser session.
 */
function extractToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) {
    const value = header.slice(7).trim();
    if (value.length > 0) return value;
  }

  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[ACCESS_TOKEN_COOKIE];
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

/**
 * Hard authentication gate. The user row is loaded on every request so that a
 * deleted account cannot keep operating on a still-valid token.
 */
export function authenticate(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) throw ApiError.unauthorized();

      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });

      if (!user) throw ApiError.unauthorized('Your account is no longer available');

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Same as `authenticate`, but leaves `req.user` undefined instead of failing. */
export function optionalAuthenticate(): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, avatarUrl: true },
      });
      if (user) req.user = user;
    } catch {
      // An invalid token on an optional route is simply treated as anonymous.
    }

    next();
  };
}
