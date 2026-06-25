import { Router } from "express";
import { validate } from "../middlewares/validate";
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

const router = Router();

router.get("/", validate({ query: listQuerySchema }), getPackagesHandler);
router.get("/:id", validate({ params: idParamSchema }), getPackageByIdHandler);
router.get(
  "/track/:trackingId",
  validate({ params: trackingIdParamSchema }),
  getPackageByTrackingIdHandler,
);
router.post("/", validate({ body: createPackageSchema }), createPackageHandler);
router.patch(
  "/:id/status",
  validate({ params: idParamSchema, body: updateStatusSchema }),
  updatePackageStatusHandler,
);
router.get(
  "/:id/history",
  validate({ params: idParamSchema }),
  getPackageHistoryHandler,
);

export default router;
