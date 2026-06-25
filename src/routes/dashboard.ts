import { Router } from "express";
import { validate } from "../middlewares/validate";
import { getDashboardHandler } from "../controllers/dashboard.controller";
import { dashboardQuerySchema } from "../schemas/dashboard.schemas";

const router = Router();

// ─── GET /api/dashboard ───────────────────────────────────
router.get("/", validate({ query: dashboardQuerySchema }), getDashboardHandler);

export default router;
