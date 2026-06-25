import z from "zod";

export const packageStatusEnum = z.enum([
  "to_be_picked_up",
  "picked_up",
  "added_to_bag",
  "in_transit",
  "arrived",
  "scheduled_for_delivery",
  "out_for_delivery",
  "delivered",
  "delayed",
]);

export const idParamSchema = z.object({ id: z.string().uuid() });
export const trackingIdParamSchema = z.object({ trackingId: z.string().min(1) });

export const createPackageSchema = z.object({
  trackingId: z.string().min(1),
  senderName: z.string().min(1),
  senderAddress: z.string().min(1),
  receiverName: z.string().min(1),
  receiverAddress: z.string().min(1),
  weightKg: z.number().positive(),
  originRegionId: z.string().uuid(),
  destRegionId: z.string().uuid(),
  currentRegionId: z.string().uuid().optional(),
});

export const updateStatusSchema = z.object({
  status: packageStatusEnum,
  notes: z.string().optional(),
  regionId: z.string().uuid().optional(),
  bagId: z.string().uuid().optional(),
});

export const listQuerySchema = z.object({
  status: packageStatusEnum.optional(),
  regionId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
