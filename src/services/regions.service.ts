import { z } from "zod";
import { AppError } from "../utils/AppError";
import { createRegionSchema } from "../schemas/regions.schemas";
import { prisma } from "../config/database";

export type CreateRegionInput = z.infer<typeof createRegionSchema>;

export async function getRegions() {
  return await prisma.region.findMany({
    where: { parentRegionId: null },
    include: {
      subRegions: true,
      _count: {
        select: {
          currentPackages: true,
          trucks: true,
        },
      },
    },
    orderBy: { regionCode: "asc" },
  });
}

export async function getAllRegions() {
  return await prisma.region.findMany({
    orderBy: [{ parentRegionId: "asc" }, { regionCode: "asc" }],
  });
}

export async function getRegionById(id: string) {
  const region = await prisma.region.findUnique({
    where: { id },
    include: {
      subRegions: true,
      parentRegion: true,
      currentPackages: {
        select: {
          id: true,
          trackingId: true,
          senderName: true,
          receiverName: true,
          currentStatus: true,
          weightKg: true,
        },
        take: 50,
      },
      trucks: {
        select: { id: true, truckCode: true, status: true, capacity: true },
      },
      _count: {
        select: {
          currentPackages: true,
          trucks: true,
        },
      },
    },
  });

  if (!region) {
    throw new AppError("Region not found", 404);
  }

  return region;
}

export async function createRegion(data: CreateRegionInput) {
  // Check for duplicate regionCode
  const existing = await prisma.region.findUnique({
    where: { regionCode: data.regionCode },
  });
  if (existing) {
    throw new AppError(`Region code '${data.regionCode}' already exists`, 409);
  }

  // Validate parent exists (if provided)
  if (data.parentRegionId) {
    const parent = await prisma.region.findUnique({
      where: { id: data.parentRegionId },
    });
    if (!parent) {
      throw new AppError("Parent region not found", 404);
    }
  }

  return await prisma.region.create({
    data: {
      regionCode: data.regionCode,
      regionName: data.regionName,
      parentRegionId: data.parentRegionId,
    },
    include: {
      parentRegion: { select: { regionCode: true, regionName: true } },
      subRegions: true,
    },
  });
}
