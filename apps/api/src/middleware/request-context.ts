import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from '../config/logger.js';

/**
 * Attaches a correlation id to every request and echoes it back in `X-Request-Id`.
 * The same id is embedded in error responses, which makes a screenshot of a failure
 * enough to find the exact log line that produced it.
 */
export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-request-id');
    req.id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  };
}

/** Structured access logs, quiet for health checks so probes do not flood the log. */
export function httpLogger(): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as Request).id ?? randomUUID(),
    autoLogging: {
      ignore: (req) => req.url === '/api/v1/health' || req.url === '/health',
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }) as RequestHandler;
}
