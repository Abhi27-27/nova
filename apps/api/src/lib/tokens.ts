import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './api-error.js';
import { parseDuration } from './crypto.js';

export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  email: string;
}

const ACCESS_TOKEN_TTL_MS = parseDuration(env.ACCESS_TOKEN_TTL, 15 * 60 * 1000);
const REFRESH_TOKEN_TTL_MS = parseDuration(env.REFRESH_TOKEN_TTL, 30 * 24 * 60 * 60 * 1000);

export const tokenTtl = {
  accessMs: ACCESS_TOKEN_TTL_MS,
  refreshMs: REFRESH_TOKEN_TTL_MS,
};

const ISSUER = 'nova-api';
const AUDIENCE = 'nova-web';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/**
 * Verifies an access token, mapping every failure mode onto a 401 so callers
 * cannot distinguish "expired" from "forged" from "signed by another service".
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof decoded === 'string' || !decoded.sub) {
      throw ApiError.unauthorized('Your session is no longer valid');
    }

    return { sub: String(decoded.sub), email: String((decoded as jwt.JwtPayload).email ?? '') };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Your session has expired');
    }
    throw ApiError.unauthorized('Your session is no longer valid');
  }
}

export function refreshTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + REFRESH_TOKEN_TTL_MS);
}
