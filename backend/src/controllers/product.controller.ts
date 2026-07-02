import { Request, Response } from "express";
import { z } from "zod";
import { Product, CASHIER_SAFE_PRODUCT_FIELDS } from "../models/product.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

const querySchema = z.object({
  search: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "Invalid query params",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }
    const { search, page, limit } = parsed.data;
    const tenantId = req.auth!.tenantId;

    const filter = {
      tenantId,
      ...(search
        ? { name: { $regex: `^${escapeRegex(search)}`, $options: "i" } }
        : {}),
    };

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select(CASHIER_SAFE_PRODUCT_FIELDS)
        .collation({ locale: "en", strength: 2 })
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter).collation({ locale: "en", strength: 2 }),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }
);
