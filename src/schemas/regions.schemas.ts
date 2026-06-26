import z from "zod";

export const idParamSchema = z.object({
  id: z.string().uuid("Must be a valid UUID"),
});

export const createRegionSchema = z.object({
  regionCode: z.string().min(1, "regionCode is required").toUpperCase(),
  regionName: z.string().min(1, "regionName is required"),
  parentRegionId: z.string().uuid().optional(),
});

export const listRegionsQuerySchema = z.object({
  parentOnly: z.coerce.boolean().default(false),
});
