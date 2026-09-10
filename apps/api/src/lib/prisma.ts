import { PrismaClient } from '@prisma/client';
import { isDevelopment, isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * A single PrismaClient per process.
 *
 * `tsx watch` reloads the module graph on every save, so the instance is cached on
 * `globalThis` in development to avoid exhausting the database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? [{ emit: 'event', level: 'query' }, 'warn', 'error'] : ['warn', 'error'],
  });

if (isDevelopment) {
  globalForPrisma.prisma = prisma;

  // Surface slow queries during development so N+1s are obvious while building.
  prisma.$on('query' as never, (event: { query: string; duration: number }) => {
    if (event.duration >= 200) {
      logger.warn({ durationMs: event.duration, query: event.query }, 'Slow database query');
    }
  });
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connection established');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database connection closed');
}

/** Lightweight readiness probe used by `GET /api/v1/health`. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    if (!isProduction) logger.error({ err: error }, 'Database ping failed');
    return false;
  }
}

export type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
