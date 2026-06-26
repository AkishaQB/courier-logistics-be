import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { BagStatus } from "../interfaces/bags.interface";

export interface GetBagsOptions {
  page: number;
  limit: number;
  status?: string;
  originRegionId?: string;
  destRegionId?: string;
}

export interface CreateBagInput {
  bagCode: string;
  direction: string;
  originRegionId: string;
  destRegionId: string;
}

export async function getBags(opts: GetBagsOptions) {
  const { page, limit, status, originRegionId, destRegionId } = opts;
  const skip = (page - 1) * limit;

  const where = {
    status: status as BagStatus,
    originRegionId,
    destRegionId,
  };

  const [bags, total] = await Promise.all([
    prisma.bag.findMany({
      where,
      include: {
        originRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
        _count: { select: { bagPackages: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.bag.count({ where }),
  ]);

  return {
    bags,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBagById(id: string) {
  return await prisma.bag.findUnique({
    where: { id },
    include: {
      originRegion: true,
      destRegion: true,
      bagPackages: {
        include: {
          package: {
            select: {
              id: true,
              trackingId: true,
              senderName: true,
              receiverName: true,
              weightKg: true,
              currentStatus: true,
              destRegion: {
                select: { regionCode: true, regionName: true },
              },
            },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      truckBags: {
        include: {
          truckSchedule: {
            include: {
              truck: { select: { truckCode: true } },
              region: { select: { regionCode: true } },
            },
          },
        },
      },
    },
  });
}

export async function createBag(data: CreateBagInput) {
  const regions = await prisma.region.findMany({
    where: { id: { in: [data.originRegionId, data.destRegionId] } },
    select: { id: true },
  });

  if (regions.length !== 2 && data.originRegionId !== data.destRegionId) {
    throw new AppError("One or more region IDs are invalid", 400);
  }

  const existing = await prisma.bag.findUnique({
    where: { bagCode: data.bagCode },
  });

  if (existing) {
    throw new AppError(`Bag code '${data.bagCode}' already exists`, 409);
  }

  return await prisma.bag.create({
    data,
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
    },
  });
}

export async function addPackageToBag(bagId: string, packageId: string) {
  const bag = await prisma.bag.findUnique({ where: { id: bagId } });
  if (!bag) throw new AppError("Bag not found", 404);
  if (bag.status !== "open") {
    throw new AppError("Cannot add packages to a bag that is not open", 400);
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new AppError("Package not found", 404);

  const alreadyInBag = await prisma.bagPackage.findFirst({
    where: {
      packageId,
      bag: { status: "open" },
    },
  });

  if (alreadyInBag) {
    throw new AppError("Package is already in an open bag", 409);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bagPackage.create({ data: { bagId, packageId } });

    await tx.package.update({
      where: { id: packageId },
      data: { currentStatus: "added_to_bag" },
    });

    await tx.packageStatusHistory.create({
      data: {
        packageId,
        status: "added_to_bag",
        notes: `Added to bag ${bag.bagCode}`,
        bagId,
        regionId: bag.originRegionId,
      },
    });
  });

  return prisma.bag.findUnique({
    where: { id: bagId },
    include: {
      bagPackages: {
        include: {
          package: {
            select: { id: true, trackingId: true, weightKg: true },
          },
        },
      },
      _count: { select: { bagPackages: true } },
    },
  });
}

export async function removePackageFromBag(bagId: string, packageId: string) {
  const bag = await prisma.bag.findUnique({ where: { id: bagId } });
  if (!bag) throw new AppError("Bag not found", 404);
  if (bag.status !== "open") {
    throw new AppError(
      "Cannot remove packages from a bag that is not open",
      400,
    );
  }

  const bagPackage = await prisma.bagPackage.findFirst({
    where: { bagId, packageId },
  });

  if (!bagPackage) {
    throw new AppError("Package is not in this bag", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bagPackage.delete({ where: { id: bagPackage.id } });
    await tx.package.update({
      where: { id: packageId },
      data: { currentStatus: "picked_up" },
    });
    await tx.packageStatusHistory.create({
      data: {
        packageId,
        status: "picked_up",
        notes: `Removed from bag ${bag.bagCode}`,
        regionId: bag.originRegionId,
      },
    });
  });
}

export async function sealBag(id: string) {
  const bag = await prisma.bag.findUnique({
    where: { id },
    include: { _count: { select: { bagPackages: true } } },
  });
  if (!bag) throw new AppError("Bag not found", 404);
  if (bag.status !== "open") {
    throw new AppError(`Bag is already '${bag.status}' — cannot seal`, 400);
  }
  if (bag._count.bagPackages === 0) {
    throw new AppError("Cannot seal an empty bag", 400);
  }

  return await prisma.bag.update({
    where: { id },
    data: {
      status: "sealed",
      sealedAt: new Date(),
    },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      _count: { select: { bagPackages: true } },
    },
  });
}

export async function updateBagStatus(id: string, status: BagStatus, notes?: string) {
  const bag = await prisma.bag.findUnique({
    where: { id },
  });
  if (!bag) throw new AppError("Bag not found", 404);

  return await prisma.$transaction(async (tx) => {
    const updatedBag = await tx.bag.update({
      where: { id },
      data: { status },
      include: {
        originRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
        _count: { select: { bagPackages: true } },
      },
    });

    let packageStatus: string | null = null;
    if (status === "delayed") {
      packageStatus = "delayed";
    } else if (status === "delivered") {
      packageStatus = "arrived";
    } else if (status === "in_transit") {
      packageStatus = "in_transit";
    }

    if (packageStatus) {
      const bagPackages = await tx.bagPackage.findMany({
        where: { bagId: id },
        select: { packageId: true },
      });

      for (const bp of bagPackages) {
        await tx.package.update({
          where: { id: bp.packageId },
          data: {
            currentStatus: packageStatus as any,
            ...(packageStatus === "arrived" && { currentRegionId: bag.destRegionId }),
            ...(packageStatus === "delayed" && { delayReason: notes ?? "Bag delayed" }),
          },
        });

        await tx.packageStatusHistory.create({
          data: {
            packageId: bp.packageId,
            status: packageStatus,
            notes: notes ?? `Bag status updated to ${status}`,
            bagId: id,
            regionId: bag.destRegionId,
          },
        });
      }
    }

    return updatedBag;
  });
}
