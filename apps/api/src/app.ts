import { APP_NAME, APP_TAGLINE } from '@nova/shared';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env, isProduction } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { httpLogger, requestId } from './middleware/request-context.js';
import { apiRouter } from './routes.js';

/**
 * Assembles the Express application.
 *
 * Kept separate from `server.ts` so tests can mount the app with supertest without
 * binding a port or opening a database connection pool of their own.
 */
export function createApp(): Express {
  const app = express();

  // Render, Railway and friends terminate TLS at a proxy. Without this, `req.ip`
  // is the proxy's address and `secure` cookies are never set.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId());
  app.use(httpLogger());

  app.use(
    helmet({
      // The API serves JSON plus Swagger UI, which needs inline styles.
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin and non-browser callers (cURL, server-side rendering) send no
        // Origin header at all; those are allowed through.
        if (!origin) return callback(null, true);

        const normalised = origin.replace(/\/$/, '');
        if (env.CORS_ORIGINS.includes(normalised)) return callback(null, true);

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86400,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: `${APP_NAME} API`,
        tagline: APP_TAGLINE,
        version: '1.0.0',
        documentation: '/docs',
        openapi: '/api/v1/openapi.json',
        health: '/api/v1/health',
      },
    });
  });

  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument as unknown as Record<string, unknown>, {
      customSiteTitle: `${APP_NAME} API reference`,
      swaggerOptions: { persistAuthorization: true, docExpansion: 'none', filter: true },
    }),
  );

  app.use('/api/v1', apiRateLimiter, apiRouter);

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}
