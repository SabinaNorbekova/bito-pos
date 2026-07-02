import mongoose, { Types } from "mongoose";
import { Product } from "../models/product.model";
import { Order, IOrderItem } from "../models/order.model";
import { ApiError } from "../utils/ApiError";

export interface CartLineInput {
  productId: string;
  qty: number;
}

export async function placeOrder(
  tenantId: string,
  cashierId: string,
  cart: CartLineInput[]
): Promise<InstanceType<typeof Order>> {
  if (!cart.length) {
    throw ApiError.badRequest("Cart is empty", "EMPTY_CART");
  }

  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const items: IOrderItem[] = [];

      for (const line of cart) {
        if (
          !Types.ObjectId.isValid(line.productId) ||
          !Number.isInteger(line.qty) ||
          line.qty < 1
        ) {
          throw ApiError.badRequest("Invalid cart line", "INVALID_CART_LINE", {
            line,
          });
        }

        const updated = await Product.findOneAndUpdate(
          {
            _id: line.productId,
            tenantId,
            stock: { $gte: line.qty },
          },
          {
            $inc: { stock: -line.qty, version: 1 },
          },
          { session, new: true, select: "+costPrice" }
        );

        if (!updated) {
          const exists = await Product.exists({
            _id: line.productId,
            tenantId,
          }).session(session);
          if (!exists) {
            throw ApiError.notFound(
              `Product ${line.productId} not found`,
              "PRODUCT_NOT_FOUND"
            );
          }
          throw ApiError.conflict(
            `Insufficient stock for product ${line.productId}`,
            "INSUFFICIENT_STOCK",
            { productId: line.productId, requestedQty: line.qty }
          );
        }

        const lineTotal = Math.round(updated.price * line.qty * 100) / 100;
        items.push({
          productId: updated._id,
          name: updated.name,
          sku: updated.sku,
          qty: line.qty,
          priceAtSale: updated.price,
          costPriceAtSale: updated.costPrice,
          lineTotal,
        });
      }

      const grandTotal =
        Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

      const [order] = await Order.create(
        [
          {
            tenantId,
            cashierId,
            items,
            grandTotal,
            status: "pending_payment",
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return order;
    } catch (err) {
      await session.abortTransaction().catch(() => undefined);
      session.endSession();

      const isTransient =
        typeof err === "object" &&
        err !== null &&
        "errorLabels" in err &&
        Array.isArray((err as { errorLabels?: string[] }).errorLabels) &&
        (err as { errorLabels: string[] }).errorLabels.includes(
          "TransientTransactionError"
        );

      if (isTransient && attempt < maxRetries) {
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}
