import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  getAllRegionsHandler,
  createRegionHandler,
  getRegionByIdHandler,
  getRegionsHandler,
} from "../controllers/regions.controller";
import { createRegionSchema, idParamSchema } from "../schemas/regions.schemas";

const router = Router();

// GET /api/regions — top-level regions with sub-regions
router.get("/", getRegionsHandler);

// GET /api/regions/all — flat list of all regions
router.get("/all", getAllRegionsHandler);

// GET /api/regions/:id — single region with sub-regions, packages, trucks
router.get("/:id", validate({ params: idParamSchema }), getRegionByIdHandler);

// POST /api/regions — create a new region (optionally as a sub-region)
router.post("/", validate({ body: createRegionSchema }), createRegionHandler);

export default router;
