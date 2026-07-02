import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getSalesReportHandler } from "../controllers/report.controller";

const router = Router();

router.get("/sales", requireAuth, requireRole("admin"), getSalesReportHandler);

export default router;
