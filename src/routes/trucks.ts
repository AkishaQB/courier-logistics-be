import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  createTruckSchema,
  idParamSchema,
  listQuerySchema,
  updateTruckSchema,
} from "../schemas/trucks.schemas";
import {
  createTruckHandler,
  getTruckByIdHandler,
  getTrucksHandler,
  updateTruckHandler,
} from "../controllers/trucks.controller";

const router = Router();

router.get("/", validate({ query: listQuerySchema }), getTrucksHandler);
router.get("/:id", validate({ params: idParamSchema }), getTruckByIdHandler);
router.post("/", validate({ body: createTruckSchema }), createTruckHandler);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateTruckSchema }),
  updateTruckHandler,
);

export default router;
