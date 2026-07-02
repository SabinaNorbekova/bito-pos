import { Schema, model, Types } from "mongoose";

export interface ITenant {
  _id: Types.ObjectId;
  name: string;
  createdAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const Tenant = model<ITenant>("Tenant", tenantSchema);
