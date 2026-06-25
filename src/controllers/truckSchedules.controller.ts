import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createTruckSchedule,
  departTruckSchedule,
  getTruckScheduleById,
  getTruckSchedules,
  loadBagOntoTruckSchedule,
  updateTruckSchedule,
} from "../services/truckSchedules.service";
import {
  createScheduleSchema,
  departSchema,
  idParamSchema,
  listQuerySchema,
  loadBagSchema,
  updateScheduleSchema,
} from "../schemas/truckSchedules.schemas";

export async function getTruckSchedulesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const schedules = await getTruckSchedules(query);
    res.json(schedules);
  } catch (err) {
    next(err);
  }
}

export async function getTruckScheduleByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const schedule = await getTruckScheduleById(id);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function createTruckScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body as z.infer<typeof createScheduleSchema>;
    const schedule = await createTruckSchedule(payload);
    res.status(201).json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function loadBagOntoTruckScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const payload = req.body as z.infer<typeof loadBagSchema>;
    const schedule = await loadBagOntoTruckSchedule(id, payload);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function departTruckScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const payload = req.body as z.infer<typeof departSchema>;
    const schedule = await departTruckSchedule(id, payload);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateTruckScheduleHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const payload = req.body as z.infer<typeof updateScheduleSchema>;
    const schedule = await updateTruckSchedule(id, payload);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}
