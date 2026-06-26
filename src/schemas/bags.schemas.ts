import z from "zod";
import { BagStatus } from "../interfaces/bags.interface";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createBagSchema = z.object({
  bagCode: z.string().min(1),
  direction: z.string().min(1),
  originRegionId: z.string().uuid(),
  destRegionId: z.string().uuid(),
});

export const addPackageSchema = z.object({
  packageId: z.string().uuid(),
});

export const listBagsQuerySchema = z.object({
  status: z.enum(Object.values(BagStatus) as [string, ...string[]]).optional(),
  originRegionId: z.string().uuid().optional(),
  destRegionId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateBagStatusSchema = z.object({
  status: z.nativeEnum(BagStatus),
  notes: z.string().optional(),
});
