import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError } from '../src/lib/api-error.js';
import { buildPageInfo, sendData } from '../src/lib/http.js';
import { defineRoute } from '../src/lib/route.js';
import { errorHandler, notFoundHandler } from '../src/middleware/error-handler.js';
import { requestId } from '../src/middleware/request-context.js';

/**
 * Exercises the route kernel and the central error handler through a real Express
 * app, which is the only way to prove the response envelope is what clients see.
 */
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId());

  app.post(
    '/echo',
    defineRoute(
      {
        body: z.object({ title: z.string().min(3), count: z.number().int().positive() }),
        query: z.object({ mode: z.enum(['fast', 'slow']).default('fast') }),
      },
      async ({ body, query, res }) => sendData(res, { ...body, mode: query.mode }),
    ),
  );

  app.get(
    '/protected',
    defineRoute({}, async ({ user, res }) => sendData(res, user)),
  );

  app.get(
    '/boom',
    defineRoute({}, async () => {
      throw ApiError.conflict('That already exists');
    }),
  );

  app.get(
    '/crash',
    defineRoute({}, async () => {
      throw new Error('database on fire');
    }),
  );

  app.use(notFoundHandler());
  app.use(errorHandler());
  return app;
}

describe('response envelope', () => {
  it('wraps success in { success, data }', async () => {
    const response = await request(buildTestApp())
      .post('/echo?mode=slow')
      .send({ title: 'Ship it', count: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { title: 'Ship it', count: 2, mode: 'slow' },
    });
  });

  it('applies query defaults declared in the schema', async () => {
    const response = await request(buildTestApp())
      .post('/echo')
      .send({ title: 'Ship it', count: 1 });
    expect(response.body.data.mode).toBe('fast');
  });

  it('echoes a correlation id on every response', async () => {
    const response = await request(buildTestApp()).get('/boom');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });
});

describe('validation', () => {
  it('reports every invalid field in a single 422 rather than one at a time', async () => {
    const response = await request(buildTestApp())
      .post('/echo?mode=sideways')
      .send({ title: 'no', count: -4 });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.details).sort()).toEqual([
      'count',
      'query.mode',
      'title',
    ]);
  });

  it('rejects malformed JSON with a 400, not a crash', async () => {
    const response = await request(buildTestApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('error handling', () => {
  it('turns an unauthenticated context access into a 401', async () => {
    const response = await request(buildTestApp()).get('/protected');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('passes operational errors through with their status and message', async () => {
    const response = await request(buildTestApp()).get('/boom');
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: 'CONFLICT', message: 'That already exists' });
  });

  it('never leaks internal failure details in the message', async () => {
    const response = await request(buildTestApp()).get('/crash');
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).not.toContain('database on fire');
  });

  it('returns a structured 404 for unmatched routes', async () => {
    const response = await request(buildTestApp()).get('/nowhere');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('pagination metadata', () => {
  it('describes the middle of a result set', () => {
    expect(buildPageInfo(120, 3, 25)).toEqual({
      page: 3,
      pageSize: 25,
      total: 120,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('describes an empty result set without offering a next page', () => {
    expect(buildPageInfo(0, 1, 25)).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
