/**
 * Global error handling middleware.
 *
 * Express recognises this as an error handler because it has
 * 4 parameters (err, req, res, next). It MUST be registered
 * AFTER all routes in app.ts.
 *
 * Behaviour:
 *   - AppError (operational) → returns err.statusCode + message
 *   - Unknown errors         → returns 500 + generic message
 *   - Logs full error in non-production for debugging
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── AppError (we threw this intentionally) ────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // ── Unexpected error ──────────────────────────────────
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: "Internal server error",
  });
}
