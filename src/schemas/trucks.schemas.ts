import z from "zod";

export const truckStatusEnum = z.enum(["idle", "loading", "in_transit", "delayed"]);

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createTruckSchema = z.object({
  truckCode: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  currentRegionId: z.string().uuid(),
});

export const updateTruckSchema = z.object({
  status: truckStatusEnum.optional(),
  currentRegionId: z.string().uuid().optional(),
  delayReason: z.string().optional(),
});

export const listQuerySchema = z.object({
  status: truckStatusEnum.optional(),
  regionId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
