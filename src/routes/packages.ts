import { Router } from "express";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import {
  createPackageSchema,
  idParamSchema,
  listQuerySchema,
  trackingIdParamSchema,
  updateStatusSchema,
} from "../schemas/packages.schemas";
import {
  createPackageHandler,
  getPackageByIdHandler,
  getPackageByTrackingIdHandler,
  getPackageHistoryHandler,
  getPackagesHandler,
  updatePackageStatusHandler,
} from "../controllers/packages.controller";

const logisticsAuth = [authenticate, requireRole("logistics", "admin")];

const router = Router();

// GET /api/packages [public]
router.get("/", validate({ query: listQuerySchema }), getPackagesHandler);

// GET /api/packages/track/:trackingId [public]
router.get(
  "/track/:trackingId",
  validate({ params: trackingIdParamSchema }),
  getPackageByTrackingIdHandler,
);

// GET /api/packages/:id [public]
router.get("/:id", validate({ params: idParamSchema }), getPackageByIdHandler);

// GET /api/packages/:id/history [public]
router.get(
  "/:id/history",
  validate({ params: idParamSchema }),
  getPackageHistoryHandler,
);

// POST /api/packages [auth: logistics | admin]
router.post("/", ...logisticsAuth, validate({ body: createPackageSchema }), createPackageHandler);

// PATCH /api/packages/:id/status [auth: logistics | admin]
router.patch(
  "/:id/status",
  ...logisticsAuth,
  validate({ params: idParamSchema, body: updateStatusSchema }),
  updatePackageStatusHandler,
);

export default router;
