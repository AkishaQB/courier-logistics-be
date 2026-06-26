import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  getDashboardHandler,
  getNewArrivalsHandler,
  getTruckArrivalsHandler,
  getLoadedHandler,
  getDelayedHandler,
} from "../controllers/dashboard.controller";
import { dashboardQuerySchema } from "../schemas/dashboard.schemas";

const router = Router();

// GET /api/dashboard — combined overview (summary + recent packages + schedules + region counts)
router.get("/", validate({ query: dashboardQuerySchema }), getDashboardHandler);

// GET /api/dashboard/new-arrivals — packages not yet bagged (to_be_picked_up | picked_up)
router.get("/new-arrivals", validate({ query: dashboardQuerySchema }), getNewArrivalsHandler);

// GET /api/dashboard/truck-arrivals — packages that arrived at hub, awaiting re-bagging
router.get("/truck-arrivals", validate({ query: dashboardQuerySchema }), getTruckArrivalsHandler);

// GET /api/dashboard/loaded — packages currently in transit (added_to_bag | in_transit)
router.get("/loaded", validate({ query: dashboardQuerySchema }), getLoadedHandler);

// GET /api/dashboard/delayed — all delayed packages with delay reason
router.get("/delayed", validate({ query: dashboardQuerySchema }), getDelayedHandler);

export default router;
