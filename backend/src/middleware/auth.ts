import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { Tenant } from "../models/tenant.model";
import { asyncHandler } from "../utils/asyncHandler";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing bearer token");
    }

    const token = header.slice("Bearer ".length);
    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    if (!payload.tenantId || !Types.ObjectId.isValid(payload.tenantId)) {
      throw ApiError.unauthorized("Token missing a valid tenant");
    }

    const tenantExists = await Tenant.exists({ _id: payload.tenantId });
    if (!tenantExists) {
      throw ApiError.forbidden("Tenant not found", "TENANT_NOT_FOUND");
    }

    req.auth = payload;
    next();
  }
);

export function requireRole(...roles: Array<"admin" | "cashier">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw ApiError.unauthorized();
    if (!roles.includes(req.auth.role)) {
      throw ApiError.forbidden(
        "You do not have access to this resource",
        "ROLE_FORBIDDEN"
      );
    }
    next();
  };
}
