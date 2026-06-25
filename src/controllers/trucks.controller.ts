import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createTruck,
  getTruckById,
  getTrucks,
  updateTruck,
} from "../services/trucks.service";
import {
  createTruckSchema,
  idParamSchema,
  listQuerySchema,
  updateTruckSchema,
} from "../schemas/trucks.schemas";

export async function getTrucksHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const trucks = await getTrucks(query);
    res.json(trucks);
  } catch (err) {
    next(err);
  }
}

export async function getTruckByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const truck = await getTruckById(id);
    res.json({ data: truck });
  } catch (err) {
    next(err);
  }
}

export async function createTruckHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body as z.infer<typeof createTruckSchema>;
    const truck = await createTruck(payload);
    res.status(201).json({ data: truck });
  } catch (err) {
    next(err);
  }
}

export async function updateTruckHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const payload = req.body as z.infer<typeof updateTruckSchema>;
    const truck = await updateTruck(id, payload);
    res.json({ data: truck });
  } catch (err) {
    next(err);
  }
}
