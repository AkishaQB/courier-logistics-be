import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { z } from "zod";
import {
  createPackageSchema,
  listQuerySchema,
  updateStatusSchema,
} from "../schemas/packages.schemas";

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageStatusInput = z.infer<typeof updateStatusSchema>;
export type GetPackagesOptions = z.infer<typeof listQuerySchema>;

export async function getPackages(opts: GetPackagesOptions) {
  const { status, regionId, search, page, limit } = opts;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { currentStatus: status }),
    ...(regionId && { currentRegionId: regionId }),
    ...(search && {
      OR: [
        { trackingId: { contains: search, mode: "insensitive" as const } },
        { senderName: { contains: search, mode: "insensitive" as const } },
        { receiverName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      include: {
        originRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
        currentRegion: { select: { regionCode: true, regionName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.package.count({ where }),
  ]);

  return {
    data: packages,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPackageById(id: string) {
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      originRegion: true,
      destRegion: true,
      currentRegion: true,
      statusHistory: {
        include: { region: true, bag: true },
        orderBy: { createdAt: "asc" },
      },
      bagPackages: {
        include: {
          bag: {
            select: { id: true, bagCode: true, status: true, direction: true },
          },
        },
      },
    },
  });

  if (!pkg) {
    throw new AppError("Package not found", 404);
  }

  return pkg;
}

export async function getPackageByTrackingId(trackingId: string) {
  const pkg = await prisma.package.findUnique({
    where: { trackingId },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      currentRegion: { select: { regionCode: true, regionName: true } },
      statusHistory: {
        include: { region: { select: { regionCode: true, regionName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pkg) {
    throw new AppError("Package not found", 404);
  }

  return pkg;
}

export async function createPackage(payload: CreatePackageInput) {
  const regionIds = [
    payload.originRegionId,
    payload.destRegionId,
    payload.currentRegionId ?? payload.originRegionId,
  ];
  const uniqueIds = [...new Set(regionIds)];

  const foundRegions = await prisma.region.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (foundRegions.length !== uniqueIds.length) {
    throw new AppError("One or more region IDs are invalid", 400);
  }

  const existing = await prisma.package.findUnique({
    where: { trackingId: payload.trackingId },
  });
  if (existing) {
    throw new AppError(
      `Tracking ID '${payload.trackingId}' already exists`,
      409,
    );
  }

  return await prisma.$transaction(async (tx) => {
    const created = await tx.package.create({
      data: {
        trackingId: payload.trackingId,
        senderName: payload.senderName,
        senderAddress: payload.senderAddress,
        receiverName: payload.receiverName,
        receiverAddress: payload.receiverAddress,
        weightKg: payload.weightKg,
        originRegionId: payload.originRegionId,
        destRegionId: payload.destRegionId,
        currentRegionId: payload.currentRegionId ?? payload.originRegionId,
      },
      include: {
        originRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
        currentRegion: { select: { regionCode: true, regionName: true } },
      },
    });

    await tx.packageStatusHistory.create({
      data: {
        packageId: created.id,
        status: "to_be_picked_up",
        notes: "Package registered in logistics system",
        regionId: created.currentRegionId,
      },
    });

    return created;
  });
}

export async function updatePackageStatus(
  id: string,
  payload: UpdatePackageStatusInput,
) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Package not found", 404);
  }

  return await prisma.$transaction(async (tx) => {
    const pkg = await tx.package.update({
      where: { id },
      data: {
        currentStatus: payload.status,
        ...(payload.regionId && { currentRegionId: payload.regionId }),
        ...(payload.status === "delayed"
          ? { delayReason: payload.notes }
          : { delayReason: null }),
      },
      include: {
        originRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
        currentRegion: { select: { regionCode: true, regionName: true } },
      },
    });

    await tx.packageStatusHistory.create({
      data: {
        packageId: id,
        status: payload.status,
        notes: payload.notes,
        regionId: payload.regionId ?? existing.currentRegionId,
        bagId: payload.bagId,
      },
    });

    return pkg;
  });
}

export async function getPackageHistory(id: string) {
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) {
    throw new AppError("Package not found", 404);
  }

  return await prisma.packageStatusHistory.findMany({
    where: { packageId: id },
    include: {
      region: { select: { regionCode: true, regionName: true } },
      bag: { select: { bagCode: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}
