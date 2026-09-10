import type { Server } from 'node:http';
import { APP_NAME } from '@nova/shared';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';

/**
 * Process entry point: connect, listen, and shut down cleanly.
 *
 * Graceful shutdown matters on platforms that roll deployments — without it the
 * old instance drops in-flight requests the moment the new one is ready.
 */
async function main(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(
      `${APP_NAME} API listening on http://localhost:${env.PORT} (${env.NODE_ENV}) — docs at /docs`,
    );
  });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal} — shutting down`);

    // Stop accepting new connections, then wait for in-flight requests to finish.
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10_000).unref());

    await Promise.race([closed, timeout]);
    await disconnectDatabase();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start the API');
  process.exit(1);
});
