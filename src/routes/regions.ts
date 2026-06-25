import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  getAllRegionsHandler,
  getRegionByIdHandler,
  getRegionsHandler,
} from "../controllers/regions.controller";
import { idParamSchema } from "../schemas/regions.schemas";

const router = Router();

router.get("/", getRegionsHandler);
router.get("/all", getAllRegionsHandler);
router.get("/:id", validate({ params: idParamSchema }), getRegionByIdHandler);

export default router;
