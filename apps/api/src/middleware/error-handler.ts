import { Prisma } from '@prisma/client';
import { ERROR_CODES, type ApiFailure } from '@nova/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError, isApiError } from '../lib/api-error.js';
import { getRequestId } from '../lib/request.js';

/** 404 for any route that did not match. */
export function notFoundHandler(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError(404, ERROR_CODES.NOT_FOUND, `Cannot ${req.method} ${req.path}`));
  };
}

function fieldsFromPrismaMeta(meta: unknown): string[] {
  const target = (meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  return [];
}

/**
 * Translates a Prisma failure into the same envelope the rest of the API uses.
 * Only the codes we can describe accurately are mapped; anything else falls
 * through to a generic 500 so we never invent a misleading message.
 */
function translatePrismaError(error: Prisma.PrismaClientKnownRequestError): ApiError | null {
  switch (error.code) {
    case 'P2002': {
      const fields = fieldsFromPrismaMeta(error.meta);
      const label = fields.length > 0 ? fields.join(', ') : 'value';
      return new ApiError(
        409,
        ERROR_CODES.CONFLICT,
        `A record with that ${label} already exists`,
        fields.length > 0
          ? Object.fromEntries(fields.map((field) => [field, ['Already in use']]))
          : undefined,
      );
    }
    case 'P2025':
      return ApiError.notFound('Record');
    case 'P2003':
      return ApiError.badRequest('A referenced record does not exist');
    case 'P2014':
      return ApiError.conflict('That change would break a required relation');
    default:
      return null;
  }
}

/**
 * Central error handler — the single place that turns a thrown value into an HTTP
 * response. Expected (`ApiError`) failures are logged at `warn` with no stack;
 * anything else is logged at `error` with the stack and reported to the client as
 * an opaque 500 so internals never leak.
 */
export function errorHandler() {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    let normalised: ApiError;

    if (isApiError(error)) {
      normalised = error;
    } else if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const key = issue.path.join('.') || '_';
        (details[key] ??= []).push(issue.message);
      }
      normalised = ApiError.validation('Some fields need your attention', details);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      normalised = translatePrismaError(error) ?? ApiError.internal();
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      normalised = ApiError.badRequest('The request contained an invalid value');
    } else if (
      error instanceof SyntaxError &&
      'body' in error &&
      (error as { status?: number }).status === 400
    ) {
      normalised = ApiError.badRequest('The request body is not valid JSON');
    } else if ((error as { type?: string }).type === 'entity.too.large') {
      normalised = new ApiError(
        413,
        ERROR_CODES.PAYLOAD_TOO_LARGE,
        'The request body is too large',
      );
    } else {
      normalised = ApiError.internal();
    }

    const logPayload = {
      requestId: getRequestId(req),
      method: req.method,
      path: req.originalUrl,
      statusCode: normalised.statusCode,
      code: normalised.code,
      userId: req.user?.id,
    };

    if (normalised.statusCode >= 500) {
      logger.error({ ...logPayload, err: error }, 'Unhandled request failure');
    } else {
      logger.warn(logPayload, normalised.message);
    }

    const body: ApiFailure = {
      success: false,
      error: {
        code: normalised.code,
        message: normalised.message,
        requestId: getRequestId(req),
        ...(normalised.details ? { details: normalised.details } : {}),
      },
    };

    // In development the original message is far more useful than "Something went
    // wrong", so it is surfaced alongside the safe one.
    if (!isProduction && normalised.statusCode >= 500 && error instanceof Error) {
      (body.error as Record<string, unknown>).debug = {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 6),
      };
    }

    res.status(normalised.statusCode).json(body);
  };
}
