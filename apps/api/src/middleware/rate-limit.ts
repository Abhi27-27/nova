import { ERROR_CODES, type ApiFailure } from '@nova/shared';
import type { Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env.js';
import { clientKey, getRequestId } from '../lib/request.js';

function rejection(req: Request, res: Response) {
  const body: ApiFailure = {
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Too many requests — please slow down and try again shortly',
      requestId: getRequestId(req),
    },
  };
  res.status(429).json(body);
}

const passthrough: RequestHandler = (_req, _res, next) => next();

/** Broad limiter applied to the whole API surface. */
export const apiRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: rejection,
      // Authenticated traffic is counted per account so a shared office IP does not
      // exhaust one another's budget.
      keyGenerator: (req: Request) => req.user?.id ?? clientKey(req),
    });

/**
 * Tight limiter for credential endpoints. Successful requests are not counted, so
 * a legitimate user is never locked out by their own activity — only failures and
 * brute-force attempts accumulate.
 */
export const authRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.AUTH_RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      handler: rejection,
      keyGenerator: (req: Request) => {
        const email = (req.body as { email?: unknown } | undefined)?.email;
        const ip = clientKey(req);
        return typeof email === 'string' ? `${ip}:${email.toLowerCase()}` : ip;
      },
    });
