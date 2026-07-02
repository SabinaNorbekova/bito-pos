import { Request, Response } from "express";
import { z } from "zod";
import { getSalesReport } from "../services/report.service";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

const querySchema = z.object({
  from: z.string().datetime().or(z.string().min(1)),
  to: z.string().datetime().or(z.string().min(1)),
});

export const getSalesReportHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "from/to query params are required",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }

    const from = new Date(parsed.data.from);
    const to = new Date(parsed.data.to);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from >= to
    ) {
      throw ApiError.badRequest("Invalid date range", "INVALID_RANGE");
    }

    const report = await getSalesReport(req.auth!.tenantId, from, to);
    res.json(report);
  }
);
