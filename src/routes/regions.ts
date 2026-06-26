import { Router } from "express";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import {
  getAllRegionsHandler,
  createRegionHandler,
  getRegionByIdHandler,
  getRegionsHandler,
} from "../controllers/regions.controller";
import { createRegionSchema, idParamSchema } from "../schemas/regions.schemas";

const logisticsAuth = [authenticate, requireRole("logistics", "admin")];

const router = Router();

// GET /api/regions — top-level regions with sub-regions [public]
router.get("/", getRegionsHandler);

// GET /api/regions/all — flat list of all regions [public]
router.get("/all", getAllRegionsHandler);

// GET /api/regions/:id — single region with sub-regions, packages, trucks [public]
router.get("/:id", validate({ params: idParamSchema }), getRegionByIdHandler);

// POST /api/regions — create a new region [auth: logistics | admin]
router.post("/", ...logisticsAuth, validate({ body: createRegionSchema }), createRegionHandler);

export default router;
