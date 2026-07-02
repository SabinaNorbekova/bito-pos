export type Role = "admin" | "cashier";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
}

export interface CartLine {
  product: Product;
  qty: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  priceAtSale: number;
  lineTotal: number;
}

export interface OrderReceipt {
  id: string;
  status: "pending_payment" | "paid";
  grandTotal: number;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
}

export interface SalesReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalMargin: number;
  orderCount: number;
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    margin: number;
  }>;
}

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}
