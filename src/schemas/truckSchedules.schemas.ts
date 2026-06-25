import z from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createScheduleSchema = z.object({
  truckId: z.string().uuid(),
  regionId: z.string().uuid(),
  scheduledDeparture: z.string().datetime(),
});

export const loadBagSchema = z.object({
  bagId: z.string().uuid(),
});

export const departSchema = z.object({
  actualDeparture: z.string().datetime().optional(),
});

export const updateScheduleSchema = z.object({
  status: z.enum(["scheduled", "departed", "delayed", "cancelled"]).optional(),
  delayReason: z.string().optional(),
  actualDeparture: z.string().datetime().optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(["scheduled", "departed", "delayed", "cancelled"]).optional(),
  truckId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
