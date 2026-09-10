import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { ApiError } from './api-error.js';
import type { AuthUser, WorkspaceContext } from '../types/express.js';

/**
 * The route kernel.
 *
 * Controllers are declared with the Zod schemas describing their input; the kernel
 * validates `body`, `query` and `params` in one pass, aggregates every field error
 * into a single 422 response, and hands the handler a fully typed context.
 *
 * This is also why `req.query` is never mutated: Express 5 exposes it as a getter,
 * so the parsed value lives on the context object instead.
 */
export interface RouteSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

type InferOrUndefined<T> = T extends ZodTypeAny ? z.infer<T> : undefined;

export interface RouteContext<S extends RouteSchemas> {
  body: InferOrUndefined<S['body']>;
  query: InferOrUndefined<S['query']>;
  params: InferOrUndefined<S['params']>;
  req: Request;
  res: Response;
  next: NextFunction;
  /** Throws a 401 when accessed on a route that is not behind `authenticate`. */
  readonly user: AuthUser;
  /** Throws a 401/403 when accessed on a route without `workspaceContext`. */
  readonly workspace: WorkspaceContext;
}

function collectIssues(error: ZodError, prefix: string, target: Record<string, string[]>) {
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : prefix;
    const key = prefix === 'body' ? path : `${prefix}.${path}`;
    (target[key] ??= []).push(issue.message);
  }
}

export function defineRoute<S extends RouteSchemas>(
  schemas: S,
  handler: (context: RouteContext<S>) => Promise<unknown> | unknown,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const details: Record<string, string[]> = {};
    let body: unknown;
    let query: unknown;
    let params: unknown;

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body ?? {});
      if (result.success) body = result.data;
      else collectIssues(result.error, 'body', details);
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query ?? {});
      if (result.success) query = result.data;
      else collectIssues(result.error, 'query', details);
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params ?? {});
      if (result.success) params = result.data;
      else collectIssues(result.error, 'params', details);
    }

    if (Object.keys(details).length > 0) {
      next(ApiError.validation('Some fields need your attention', details));
      return;
    }

    const context = {
      body,
      query,
      params,
      req,
      res,
      next,
      get user(): AuthUser {
        if (!req.user) throw ApiError.unauthorized();
        return req.user;
      },
      get workspace(): WorkspaceContext {
        if (!req.workspace) throw ApiError.forbidden('No workspace selected for this request');
        return req.workspace;
      },
    } as RouteContext<S>;

    try {
      await handler(context);
    } catch (error) {
      next(error);
    }
  };
}
