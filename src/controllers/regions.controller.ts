import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getAllRegions,
  createRegion,
  getRegionById,
  getRegions,
} from "../services/regions.service";
import { createRegionSchema, idParamSchema } from "../schemas/regions.schemas";

export async function getRegionsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regions = await getRegions();
    res.json({ data: regions });
  } catch (err) {
    next(err);
  }
}

export async function getAllRegionsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const regions = await getAllRegions();
    res.json({ data: regions });
  } catch (err) {
    next(err);
  }
}

export async function getRegionByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const region = await getRegionById(id);
    res.json({ data: region });
  } catch (err) {
    next(err);
  }
}

export async function createRegionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as z.infer<typeof createRegionSchema>;
    const region = await createRegion(body);
    res.status(201).json({ data: region });
  } catch (err) {
    next(err);
  }
}
