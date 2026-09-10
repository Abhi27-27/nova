import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { env } from '../config/env.js';

/** Cost factor for password hashing — ~250ms on commodity hardware. */
const BCRYPT_ROUNDS = 12;

export function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, BCRYPT_ROUNDS);
}

export function verifyPassword(plainText: string, passwordHash: string): Promise<boolean> {
  return compare(plainText, passwordHash);
}

/** URL-safe opaque token, used for refresh tokens and invitation links. */
export function generateOpaqueToken(byteLength = 48): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Refresh tokens are stored as a keyed digest rather than in the clear, so a
 * database dump alone cannot be used to mint access tokens.
 */
export function hashToken(token: string): string {
  return createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}

/** Constant-time comparison for secrets that are compared outside the database. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;
const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Turns `"30d"` into milliseconds. Falls back to the supplied default. */
export function parseDuration(value: string, fallbackMs: number): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = DURATION_UNITS[match[2] ?? 'ms'] ?? 1;
  return amount * unit;
}
