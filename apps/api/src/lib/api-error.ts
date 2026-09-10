import { ERROR_CODES, type ErrorCode } from '@nova/shared';

/**
 * The only error type the application layer throws.
 *
 * Services never talk to Express; they raise an `ApiError` and the central error
 * handler turns it into the documented response envelope. Anything else that
 * reaches the handler is treated as an unexpected fault and logged at `error`.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: Record<string, string[]> | undefined;
  /** `true` for errors that are part of the API contract rather than a crash. */
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(
    message = 'The request could not be processed',
    details?: Record<string, string[]>,
  ) {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static validation(
    message = 'Some fields need your attention',
    details?: Record<string, string[]>,
  ) {
    return new ApiError(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthorized(message = 'You need to sign in to continue') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, ERROR_CODES.NOT_FOUND, `${resource} was not found`);
  }

  static conflict(message = 'That conflicts with something that already exists') {
    return new ApiError(409, ERROR_CODES.CONFLICT, message);
  }

  static tooManyRequests(message = 'Too many requests — please slow down') {
    return new ApiError(429, ERROR_CODES.RATE_LIMITED, message);
  }

  static internal(message = 'Something went wrong on our side') {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
