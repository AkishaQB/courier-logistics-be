import { AppError } from "../utils/AppError";
import { prisma } from "../config/database";

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
