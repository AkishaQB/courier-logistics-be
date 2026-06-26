import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getDashboard,
  getNewArrivals,
  getTruckArrivals,
  getLoaded,
  getDelayed,
} from "../services/dashboard.service";
import { dashboardQuerySchema } from "../schemas/dashboard.schemas";

// GET /api/dashboard — combined overview
export async function getDashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as z.infer<typeof dashboardQuerySchema>;
    const dashboard = await getDashboard(query.regionId);
    res.json({ data: dashboard });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/new-arrivals
export async function getNewArrivalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as z.infer<typeof dashboardQuerySchema>;
    const result = await getNewArrivals(query.regionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/truck-arrivals
export async function getTruckArrivalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as z.infer<typeof dashboardQuerySchema>;
    const result = await getTruckArrivals(query.regionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/loaded
export async function getLoadedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as z.infer<typeof dashboardQuerySchema>;
    const result = await getLoaded(query.regionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/delayed
export async function getDelayedHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as z.infer<typeof dashboardQuerySchema>;
    const result = await getDelayed(query.regionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
