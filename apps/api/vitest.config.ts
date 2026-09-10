import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    // The suite covers pure logic and the HTTP layer, so it runs without a database.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://nova:nova@localhost:5432/nova_test?schema=public',
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-000000',
      JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-11111',
    },
  },
});
