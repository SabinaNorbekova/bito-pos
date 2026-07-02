import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { searchProducts } from "../controllers/product.controller";

const router = Router();

router.get("/", requireAuth, searchProducts);

export default router;
