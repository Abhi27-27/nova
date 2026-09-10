import type { Request } from 'express';

/**
 * `pino-http` widens `req.id` to `string | number | object`; NOVA always assigns a
 * string, and this accessor keeps that assumption in one place.
 */
export function getRequestId(req: Request): string {
  return typeof req.id === 'string' ? req.id : String(req.id ?? '');
}

/**
 * Stable rate-limit key for an anonymous caller.
 *
 * IPv6 clients are grouped by their /64 prefix: a single subscriber is routinely
 * handed a whole /64, so limiting per full address would let one machine bypass the
 * limit simply by rotating the host part of its address.
 */
export function clientKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  if (ip.includes(':')) {
    const normalised = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    if (!normalised.includes(':')) return normalised;
    return normalised.split(':').slice(0, 4).join(':') + '::/64';
  }

  return ip;
}
