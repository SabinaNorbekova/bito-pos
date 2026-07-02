import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { Tenant } from "../models/tenant.model";
import { User } from "../models/user.model";
import { Product } from "../models/product.model";
import { Order } from "../models/order.model";
import { WebhookEvent } from "../models/webhookEvent.model";
async function seed() {
  await connectDB();

  await Promise.all([
    Tenant.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    WebhookEvent.deleteMany({}),
  ]);

  const [tenantA, tenantB] = await Tenant.create([
    { name: "Coffee Corner" },
    { name: "Book Nook" },
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  await User.create([
    {
      tenantId: tenantA._id,
      email: "admin@coffeecorner.test",
      passwordHash,
      role: "admin",
      name: "Coffee Admin",
    },
    {
      tenantId: tenantA._id,
      email: "cashier@coffeecorner.test",
      passwordHash,
      role: "cashier",
      name: "Coffee Cashier",
    },
    {
      tenantId: tenantB._id,
      email: "admin@booknook.test",
      passwordHash,
      role: "admin",
      name: "Book Admin",
    },
    {
      tenantId: tenantB._id,
      email: "cashier@booknook.test",
      passwordHash,
      role: "cashier",
      name: "Book Cashier",
    },
  ]);

  await Product.create([
    {
      tenantId: tenantA._id,
      name: "Espresso",
      category: "Drinks",
      sku: "CC-ESP",
      price: 3.5,
      costPrice: 1.1,
      stock: 50,
    },
    {
      tenantId: tenantA._id,
      name: "Latte",
      category: "Drinks",
      sku: "CC-LAT",
      price: 4.5,
      costPrice: 1.6,
      stock: 40,
    },
    {
      tenantId: tenantA._id,
      name: "Croissant",
      category: "Food",
      sku: "CC-CRO",
      price: 3.0,
      costPrice: 1.2,
      stock: 1,
    }, 
    {
      tenantId: tenantA._id,
      name: "Blueberry Muffin",
      category: "Food",
      sku: "CC-MUF",
      price: 3.25,
      costPrice: 1.3,
      stock: 25,
    },

    {
      tenantId: tenantB._id,
      name: "The Hobbit",
      category: "Fiction",
      sku: "BN-HOB",
      price: 12.99,
      costPrice: 6.0,
      stock: 15,
    },
    {
      tenantId: tenantB._id,
      name: "Notebook A5",
      category: "Stationery",
      sku: "BN-NB5",
      price: 4.99,
      costPrice: 1.5,
      stock: 60,
    },
  ]);

  console.log("Seed complete.");
  console.log("Login with password123, e.g.:");
  console.log(
    "  cashier@coffeecorner.test / admin@coffeecorner.test  (tenant: Coffee Corner)"
  );
  console.log(
    "  cashier@booknook.test / admin@booknook.test          (tenant: Book Nook)"
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
