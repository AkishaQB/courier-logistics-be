import z from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createScheduleSchema = z.object({
  truckId: z.string().uuid(),
  originRegionId: z.string().uuid(),
  departureTime: z.string().datetime(),
  routeDescription: z.string().min(1).optional(),
  estimatedArrivalTime: z.string().datetime().optional(),
});

export const loadBagSchema = z.object({
  bagId: z.string().uuid(),
});

export const departSchema = z.object({
  actualDeparture: z.string().datetime().optional(),
});

export const updateScheduleSchema = z.object({
  status: z.enum(["scheduled", "departed", "delayed", "cancelled", "arrived"]).optional(),
  delayReason: z.string().optional(),
  actualDeparture: z.string().datetime().optional(),
});

export const listQuerySchema = z.object({
  status: z.enum(["scheduled", "departed", "delayed", "cancelled", "arrived"]).optional(),
  truckId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
