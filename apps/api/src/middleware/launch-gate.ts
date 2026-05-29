import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./error-handler";

/**
 * Blocks self-serve sign-ups until launch. When LAUNCH_MODE is off, reject
 * with 403 before validation or rate-limiting runs. Login is unaffected.
 */
export function requireSignupsEnabled(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!env.LAUNCH_MODE) {
    return next(
      new AppError(403, "SIGNUPS_DISABLED", "Sign-ups are not open yet."),
    );
  }
  next();
}
