import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate";
import {
  addPackageSchema,
  createBagSchema,
  idParamSchema,
  listBagsQuerySchema,
} from "../schemas/bags.schemas";
import {
  addPackageToBagHandler,
  createBagHandler,
  getBagByIdHandler,
  getBagsHandler,
  removePackageFromBagHandler,
  sealBagHandler,
} from "../controllers/bags.controller";

const router = Router();

// ─── GET /api/bags ────────────────────────────────────────
router.get("/", validate({ query: listBagsQuerySchema }), getBagsHandler);

// ─── GET /api/bags/:id ────────────────────────────────────
router.get("/:id", validate({ params: idParamSchema }), getBagByIdHandler);

// ─── POST /api/bags ───────────────────────────────────────
router.post("/", validate({ body: createBagSchema }), createBagHandler);

// ─── POST /api/bags/:id/packages ─────────────────────────
router.post(
  "/:id/packages",
  validate({ params: idParamSchema, body: addPackageSchema }),
  addPackageToBagHandler,
);

// ─── DELETE /api/bags/:id/packages/:packageId ─────────────
router.delete(
  "/:id/packages/:packageId",
  validate({
    params: z.object({ id: z.string().uuid(), packageId: z.string().uuid() }),
  }),
  removePackageFromBagHandler,
);

// ─── PATCH /api/bags/:id/seal ─────────────────────────────
router.patch("/:id/seal", validate({ params: idParamSchema }), sealBagHandler);

export default router;
