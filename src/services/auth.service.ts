/**
 * Auth service for courier-logistics-be.
 *
 * This service does NOT issue tokens — authentication happens in
 * courier-track-be.  This service only VERIFIES tokens so that the
 * logistics API can trust requests made with a valid JWT from the
 * shared auth system.
 *
 * Both services must share the same JWT_SECRET env variable.
 */

import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

// Must match the secret used in courier-track-be
const JWT_SECRET = process.env.JWT_SECRET || "courier-track-dev-secret-key";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws 401 AppError if the token is missing, invalid, or expired.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}
