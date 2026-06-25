/**
 * Custom application error with an HTTP status code.
 *
 * Throw this in services or controllers when you need to
 * return a specific HTTP error (e.g. 404, 400, 409).
 *
 * Unrecognised errors (plain Error, Prisma errors, etc.)
 * are treated as 500s by the error handler middleware.
 *
 * @example
 *   throw new AppError("Package not found", 404);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace (only needed for V8 engines like Node)
    Error.captureStackTrace(this, this.constructor);
  }
}
