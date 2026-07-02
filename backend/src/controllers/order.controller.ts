import { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Order } from "../models/order.model";
import { placeOrder } from "../services/order.service";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
      })
    )
    .min(1),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Invalid order payload",
      "VALIDATION_ERROR",
      parsed.error.flatten()
    );
  }

  const order = await placeOrder(
    req.auth!.tenantId,
    req.auth!.userId,
    parsed.data.items
  );

  res.status(201).json({
    id: order._id,
    status: order.status,
    grandTotal: order.grandTotal,
    items: order.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      qty: i.qty,
      priceAtSale: i.priceAtSale,
      lineTotal: i.lineTotal,
    })),
    createdAt: order.createdAt,
  });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    throw ApiError.notFound("Order not found");
  }

  const order = await Order.findOne({
    _id: id,
    tenantId: req.auth!.tenantId,
  }).select("status grandTotal createdAt paidAt items");

  if (!order) {
    throw ApiError.notFound("Order not found");
  }

  res.json({
    id: order._id,
    status: order.status,
    grandTotal: order.grandTotal,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    items: order.items,
  });
});
