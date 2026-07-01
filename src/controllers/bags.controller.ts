import { Request, NextFunction, Response } from "express";
import { z } from "zod";
import {
  addPackageSchema,
  createBagSchema,
  idParamSchema,
  listBagsQuerySchema,
  sealBagSchema,
  updateBagStatusSchema,
} from "../schemas/bags.schemas";
import {
  addPackageToBag,
  createBag,
  getBagById,
  getBags,
  removePackageFromBag,
  sealBag,
  updateBagStatus,
} from "../services/bags.service";
import { AppError } from "../utils/AppError";

export async function getBagsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as z.infer<typeof listBagsQuerySchema>;
    const bags = await getBags(query);
    res.status(200).json(bags);
  } catch (err) {
    next(err);
  }
}

export async function getBagByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const bag = await getBagById(id);
    if (!bag) throw new AppError("Bag not found", 404);
    res.json({ data: bag });
  } catch (err) {
    next(err);
  }
}

export async function createBagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as z.infer<typeof createBagSchema>;
    const bag = await createBag(body);
    res.status(201).json({ data: bag });
  } catch (err) {
    next(err);
  }
}

export async function addPackageToBagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const { packageId } = req.body as z.infer<typeof addPackageSchema>;
    const bag = await addPackageToBag(id, packageId);
    res.json({ data: bag });
  } catch (err) {
    next(err);
  }
}

export async function removePackageFromBagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, packageId } = req.params as z.infer<typeof idParamSchema> & {
      packageId: string;
    };
    await removePackageFromBag(id, packageId);
    res.json({ message: "Package removed from bag" });
  } catch (err) {
    next(err);
  }
}

export async function sealBagHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const { sealNumber } = req.body as z.infer<typeof sealBagSchema>;
    const bag = await sealBag(id, sealNumber);
    res.json({ data: bag });
  } catch (err) {
    next(err);
  }
}

export async function updateBagStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as z.infer<typeof idParamSchema>;
    const { status, notes } = req.body as z.infer<typeof updateBagStatusSchema>;
    const bag = await updateBagStatus(id, status, notes);
    res.json({ data: bag });
  } catch (err) {
    next(err);
  }
}
