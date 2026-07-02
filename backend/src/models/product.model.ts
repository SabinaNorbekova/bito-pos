import { Schema, model, Types } from "mongoose";

export interface IProduct {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  category: string;
  sku: string;
  price: number; 
  costPrice: number;
  stock: number;
  version: number; 
  createdAt: Date;
}

const productSchema = new Schema<IProduct>({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0, select: false }, 
  stock: { type: Number, required: true, min: 0 },
  version: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index(
  { tenantId: 1, name: 1 },
  { collation: { locale: "en", strength: 2 } } 
);
productSchema.index({ tenantId: 1, category: 1 });
productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

export const CASHIER_SAFE_PRODUCT_FIELDS =
  "name description category sku price stock tenantId";

export const Product = model<IProduct>("Product", productSchema);
