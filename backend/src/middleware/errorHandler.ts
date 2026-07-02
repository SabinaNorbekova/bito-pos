import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  ) {
    return res
      .status(409)
      .json({ error: { code: "DUPLICATE", message: "Duplicate resource" } });
  }

  console.error(err);
  return res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Internal server error" } });
}
