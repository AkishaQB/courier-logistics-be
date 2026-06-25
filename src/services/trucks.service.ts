import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { z } from "zod";
import {
  createTruckSchema,
  listQuerySchema,
  updateTruckSchema,
} from "../schemas/trucks.schemas";

export type CreateTruckInput = z.infer<typeof createTruckSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckSchema>;
export type GetTrucksOptions = z.infer<typeof listQuerySchema>;

export async function getTrucks(opts: GetTrucksOptions) {
  const { status, regionId, page, limit } = opts;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(regionId && { currentRegionId: regionId }),
  };

  const [trucks, total] = await Promise.all([
    prisma.truck.findMany({
      where,
      include: {
        currentRegion: { select: { regionCode: true, regionName: true } },
        _count: { select: { schedules: true } },
      },
      orderBy: { truckCode: "asc" },
      skip,
      take: limit,
    }),
    prisma.truck.count({ where }),
  ]);

  return {
    data: trucks,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTruckById(id: string) {
  const truck = await prisma.truck.findUnique({
    where: { id },
    include: {
      currentRegion: true,
      schedules: {
        include: {
          region: { select: { regionCode: true, regionName: true } },
          truckBags: {
            include: {
              bag: {
                select: {
                  bagCode: true,
                  status: true,
                  direction: true,
                  _count: { select: { bagPackages: true } },
                },
              },
            },
          },
        },
        orderBy: { scheduledDeparture: "desc" },
        take: 10,
      },
    },
  });

  if (!truck) {
    throw new AppError("Truck not found", 404);
  }

  return truck;
}

export async function createTruck(payload: CreateTruckInput) {
  const region = await prisma.region.findUnique({ where: { id: payload.currentRegionId } });
  if (!region) {
    throw new AppError("Region not found", 400);
  }

  const existing = await prisma.truck.findUnique({ where: { truckCode: payload.truckCode } });
  if (existing) {
    throw new AppError(`Truck code '${payload.truckCode}' already exists`, 409);
  }

  return await prisma.truck.create({
    data: payload,
    include: { currentRegion: { select: { regionCode: true, regionName: true } } },
  });
}

export async function updateTruck(id: string, payload: UpdateTruckInput) {
  const truck = await prisma.truck.findUnique({ where: { id } });
  if (!truck) {
    throw new AppError("Truck not found", 404);
  }

  if (payload.currentRegionId) {
    const region = await prisma.region.findUnique({ where: { id: payload.currentRegionId } });
    if (!region) {
      throw new AppError("Region not found", 400);
    }
  }

  return await prisma.truck.update({
    where: { id },
    data: {
      ...(payload.status && { status: payload.status }),
      ...(payload.currentRegionId && { currentRegionId: payload.currentRegionId }),
      delayReason:
        payload.status === "delayed"
          ? payload.delayReason
          : payload.status
          ? null
          : payload.delayReason,
    },
    include: { currentRegion: { select: { regionCode: true, regionName: true } } },
  });
}
