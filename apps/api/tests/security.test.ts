import { describe, expect, it } from 'vitest';
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  parseDuration,
  safeCompare,
  verifyPassword,
} from '../src/lib/crypto.js';
import { signAccessToken, verifyAccessToken } from '../src/lib/tokens.js';
import { clientKey } from '../src/lib/request.js';
import type { Request } from 'express';

describe('password hashing', () => {
  it('never stores the password itself and salts each hash', async () => {
    const first = await hashPassword('Password123');
    const second = await hashPassword('Password123');

    expect(first).not.toContain('Password123');
    expect(first).not.toBe(second);
    expect(await verifyPassword('Password123', first)).toBe(true);
    expect(await verifyPassword('Password123', second)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('Password123');
    expect(await verifyPassword('Password124', stored)).toBe(false);
  });
});

describe('refresh tokens', () => {
  it('produces unpredictable, url-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateOpaqueToken(32)));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes deterministically so a token can be looked up but not recovered', () => {
    const token = generateOpaqueToken();
    const digest = hashToken(token);

    expect(hashToken(token)).toBe(digest);
    expect(digest).not.toContain(token);
    expect(digest).toHaveLength(64);
  });

  it('compares secrets without leaking length through early exit', () => {
    expect(safeCompare('abc123', 'abc123')).toBe(true);
    expect(safeCompare('abc123', 'abc124')).toBe(false);
    expect(safeCompare('abc', 'abc123')).toBe(false);
  });
});

describe('access tokens', () => {
  it('round-trips the subject', () => {
    const token = signAccessToken({ sub: 'user_1', email: 'ada@example.com' });
    expect(verifyAccessToken(token)).toMatchObject({ sub: 'user_1', email: 'ada@example.com' });
  });

  it('refuses a tampered token', () => {
    const token = signAccessToken({ sub: 'user_1', email: 'ada@example.com' });
    const tampered = `${token.slice(0, -4)}AAAA`;
    expect(() => verifyAccessToken(tampered)).toThrowError(/no longer valid|expired/i);
  });

  it('refuses a token that is not a JWT at all', () => {
    expect(() => verifyAccessToken('not-a-token')).toThrowError();
  });
});

describe('durations', () => {
  it('parses the supported units', () => {
    expect(parseDuration('15m', 0)).toBe(900_000);
    expect(parseDuration('30d', 0)).toBe(2_592_000_000);
    expect(parseDuration('45s', 0)).toBe(45_000);
  });

  it('falls back rather than throwing on nonsense', () => {
    expect(parseDuration('soon', 1234)).toBe(1234);
  });
});

describe('rate limit keys', () => {
  const asRequest = (ip: string) => ({ ip, socket: { remoteAddress: ip } }) as Request;

  it('uses the address itself for IPv4', () => {
    expect(clientKey(asRequest('203.0.113.9'))).toBe('203.0.113.9');
  });

  it('groups an IPv6 client by its /64 so rotating the host part does not reset the budget', () => {
    const a = clientKey(asRequest('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd'));
    const b = clientKey(asRequest('2001:db8:1234:5678:1111:2222:3333:4444'));
    expect(a).toBe(b);
  });

  it('unwraps IPv4-mapped IPv6 addresses', () => {
    expect(clientKey(asRequest('::ffff:203.0.113.9'))).toBe('203.0.113.9');
  });
});
