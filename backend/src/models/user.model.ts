import { Schema, model, Types } from "mongoose";

export type UserRole = "admin" | "cashier";

export interface IUser {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    index: true,
  },
  email: { type: String, required: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "cashier"], required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

userSchema.index({ email: 1 }, { unique: true });

export const User = model<IUser>("User", userSchema);
