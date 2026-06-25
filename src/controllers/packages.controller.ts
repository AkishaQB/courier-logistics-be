import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createPackage,
  getPackageById,
  getPackageByTrackingId,
  getPackageHistory,
  getPackages,
  updatePackageStatus,
} from "../services/packages.service";
import {
  createPackageSchema,
  idParamSchema,
  listQuerySchema,
  trackingIdParamSchema,
  updateStatusSchema,
} from "../schemas/packages.schemas";

export async function getPackagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    const packages = await getPackages(query);
    res.json(packages);
  } catch (err) {
    next(err);
  }
}

export async function getPackageByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const pkg = await getPackageById(id);
    res.json({ data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function getPackageByTrackingIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { trackingId } = req.params as z.infer<typeof trackingIdParamSchema>;
    const pkg = await getPackageByTrackingId(trackingId);
    res.json({ data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function createPackageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = req.body as z.infer<typeof createPackageSchema>;
    const pkg = await createPackage(payload);
    res.status(201).json({ data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function updatePackageStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const payload = req.body as z.infer<typeof updateStatusSchema>;
    const pkg = await updatePackageStatus(id, payload);
    res.json({ data: pkg });
  } catch (err) {
    next(err);
  }
}

export async function getPackageHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const history = await getPackageHistory(id);
    res.json({ data: history });
  } catch (err) {
    next(err);
  }
}
