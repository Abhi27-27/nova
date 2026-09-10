import type { ApiSuccess, PageInfo, Paginated } from '@nova/shared';
import type { Response } from 'express';

/**
 * Response helpers.
 *
 * Every controller returns through these so the success envelope is identical
 * across all ~50 endpoints and can be relied on by the typed web client.
 */

export function sendData<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
) {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T) {
  return sendData(res, data, 201);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}

export function buildPageInfo(total: number, page: number, pageSize: number): PageInfo {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return { items, pageInfo: buildPageInfo(total, page, pageSize) };
}

export function sendPaginated<T>(res: Response, payload: Paginated<T>) {
  return sendData(res, payload);
}

/** Converts a 1-based page into Prisma `skip`/`take`. */
export function toSkipTake(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}
