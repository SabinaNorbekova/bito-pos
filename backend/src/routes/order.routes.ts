import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { createOrder, getOrder } from "../controllers/order.controller";

const router = Router();

router.post("/", requireAuth, requireRole("cashier", "admin"), createOrder);
router.get("/:id", requireAuth, requireRole("cashier", "admin"), getOrder);

export default router;
