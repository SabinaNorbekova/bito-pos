import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { verifyHmacSignature } from "../utils/hmac";
import { Order } from "../models/order.model";
import { WebhookEvent } from "../models/webhookEvent.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { invalidateTenantReports } from "../services/cache.service";

const payloadSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  tenantId: z.string().min(1),
  status: z.literal("paid"),
});

export const handlePaymentWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.header("X-Signature");
    const rawBody = req.rawBody;

    if (!rawBody || !verifyHmacSignature(rawBody, signature)) {
      throw ApiError.unauthorized(
        "Invalid webhook signature",
        "INVALID_SIGNATURE"
      );
    }

    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "Invalid webhook payload",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }
    const { eventId, orderId, tenantId, status } = parsed.data;

    if (!Types.ObjectId.isValid(orderId) || !Types.ObjectId.isValid(tenantId)) {
      throw ApiError.badRequest("Invalid orderId/tenantId", "VALIDATION_ERROR");
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      try {
        await WebhookEvent.create([{ eventId, orderId, tenantId }], {
          session,
        });
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          (err as { code?: number }).code === 11000
        ) {
          // Already processed this exact event - idempotent no-op.
          await session.abortTransaction();
          session.endSession();
          return res.status(200).json({ status: "already_processed" });
        }
        throw err;
      }

      const order = await Order.findOneAndUpdate(
        { _id: orderId, tenantId, status: "pending_payment" },
        { $set: { status, paidAt: new Date() } },
        { session, new: true }
      );

      if (!order) {
        const existing = await Order.findOne({ _id: orderId, tenantId })
          .select("status")
          .session(session);
        await session.commitTransaction();
        session.endSession();

        if (!existing) {
          throw ApiError.notFound(
            "Order not found for tenant",
            "ORDER_NOT_FOUND"
          );
        }
        return res
          .status(200)
          .json({ status: "already_processed", orderStatus: existing.status });
      }

      await session.commitTransaction();
      session.endSession();

      invalidateTenantReports(tenantId);

      return res
        .status(200)
        .json({ status: "ok", orderId: order._id, orderStatus: order.status });
    } catch (err) {
      await session.abortTransaction().catch(() => undefined);
      session.endSession();
      throw err;
    }
  }
);
