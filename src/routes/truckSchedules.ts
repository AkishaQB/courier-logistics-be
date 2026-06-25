import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  createScheduleSchema,
  departSchema,
  idParamSchema,
  listQuerySchema,
  loadBagSchema,
  updateScheduleSchema,
} from "../schemas/truckSchedules.schemas";
import {
  createTruckScheduleHandler,
  departTruckScheduleHandler,
  getTruckScheduleByIdHandler,
  getTruckSchedulesHandler,
  loadBagOntoTruckScheduleHandler,
  updateTruckScheduleHandler,
} from "../controllers/truckSchedules.controller";

const router = Router();

router.get("/", validate({ query: listQuerySchema }), getTruckSchedulesHandler);
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  getTruckScheduleByIdHandler,
);
router.post(
  "/",
  validate({ body: createScheduleSchema }),
  createTruckScheduleHandler,
);
router.post(
  "/:id/bags",
  validate({ params: idParamSchema, body: loadBagSchema }),
  loadBagOntoTruckScheduleHandler,
);
router.patch(
  "/:id/depart",
  validate({ params: idParamSchema, body: departSchema }),
  departTruckScheduleHandler,
);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateScheduleSchema }),
  updateTruckScheduleHandler,
);

export default router;
