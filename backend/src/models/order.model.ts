import { Schema, model, Types } from "mongoose";

export type OrderStatus = "pending_payment" | "paid";

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  sku: string;
  qty: number;
  priceAtSale: number; 
  costPriceAtSale: number; 
  lineTotal: number; 
}

export interface IOrder {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  cashierId: Types.ObjectId;
  items: IOrderItem[];
  grandTotal: number;
  status: OrderStatus;
  createdAt: Date;
  paidAt?: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    priceAtSale: { type: Number, required: true, min: 0 },
    costPriceAtSale: { type: Number, required: true, min: 0, select: false },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: { type: [orderItemSchema], required: true },
  grandTotal: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["pending_payment", "paid"],
    required: true,
    default: "pending_payment",
  },
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
});

orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export const CASHIER_SAFE_ORDER_ITEM_FIELDS =
  "productId name sku qty priceAtSale lineTotal";

export const Order = model<IOrder>("Order", orderSchema);
