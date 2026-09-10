import { pino } from 'pino';
import { env, isDevelopment, isTest } from './env.js';

/**
 * Structured logging.
 *
 * Development gets human-readable output through `pino-pretty`; production emits
 * newline-delimited JSON that hosting platforms can index directly.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'nova-api' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'newPassword',
      'currentPassword',
      'passwordHash',
      'token',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,service',
        },
      }
    : undefined,
});

export type Logger = typeof logger;
