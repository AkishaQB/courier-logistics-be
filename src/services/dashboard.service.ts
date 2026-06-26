import { prisma } from "../config/database";

// ─── Combined overview (existing) ────────────────────────────────────────────

export async function getDashboard(regionId?: string) {
  const [
    packagesByStatus,
    bagsByStatus,
    trucksByStatus,
    totalPackages,
    totalBags,
    totalTrucks,
    recentPackages,
    activeSchedules,
    regionSummary,
  ] = await Promise.all([
    prisma.package.groupBy({
      by: ["currentStatus"],
      _count: { currentStatus: true },
    }),
    prisma.bag.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.truck.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.package.count(),
    prisma.bag.count(),
    prisma.truck.count(),
    prisma.package.findMany({
      where: regionId ? { currentRegionId: regionId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        trackingId: true,
        senderName: true,
        receiverName: true,
        currentStatus: true,
        weightKg: true,
        createdAt: true,
        currentRegion: { select: { regionCode: true, regionName: true } },
        destRegion: { select: { regionCode: true, regionName: true } },
      },
    }),
    prisma.truckSchedule.findMany({
      where: { status: "scheduled" },
      include: {
        truck: { select: { truckCode: true, capacity: true } },
        region: { select: { regionCode: true, regionName: true } },
        _count: { select: { truckBags: true } },
      },
      orderBy: { scheduledDeparture: "asc" },
      take: 10,
    }),
    prisma.region.findMany({
      where: { parentRegionId: null },
      select: {
        regionCode: true,
        regionName: true,
        _count: {
          select: { currentPackages: true, trucks: true },
        },
      },
      orderBy: { regionCode: "asc" },
    }),
  ]);

  const packageStatusMap = Object.fromEntries(
    packagesByStatus.map((r) => [r.currentStatus, r._count.currentStatus]),
  );
  const bagStatusMap = Object.fromEntries(
    bagsByStatus.map((r) => [r.status, r._count.status]),
  );
  const truckStatusMap = Object.fromEntries(
    trucksByStatus.map((r) => [r.status, r._count.status]),
  );

  return {
    summary: {
      packages: {
        total: totalPackages,
        byStatus: packageStatusMap,
      },
      bags: {
        total: totalBags,
        byStatus: bagStatusMap,
      },
      trucks: {
        total: totalTrucks,
        byStatus: truckStatusMap,
      },
    },
    recentPackages,
    activeSchedules,
    regionSummary,
  };
}

// ─── Section: New Arrivals ────────────────────────────────────────────────────
/**
 * Packages that have been registered (picked_up or to_be_picked_up)
 * but have NOT yet been added to any bag.
 */
export async function getNewArrivals(regionId?: string) {
  const packages = await prisma.package.findMany({
    where: {
      currentStatus: { in: ["to_be_picked_up", "picked_up"] },
      ...(regionId && { currentRegionId: regionId }),
    },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      currentRegion: { select: { regionCode: true, regionName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return { count: packages.length, data: packages };
}

// ─── Section: Truck Arrivals ──────────────────────────────────────────────────
/**
 * Packages that recently arrived at a hub (status = "arrived")
 * and are waiting to be re-bagged for onward delivery.
 */
export async function getTruckArrivals(regionId?: string) {
  const packages = await prisma.package.findMany({
    where: {
      currentStatus: "arrived",
      ...(regionId && { currentRegionId: regionId }),
    },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      currentRegion: { select: { regionCode: true, regionName: true } },
      bagPackages: {
        include: {
          bag: { select: { bagCode: true, status: true, direction: true } },
        },
        orderBy: { addedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { count: packages.length, data: packages };
}

// ─── Section: Loaded ─────────────────────────────────────────────────────────
/**
 * Packages currently in transit (added_to_bag or in_transit),
 * i.e., bagged and loaded on trucks.
 */
export async function getLoaded(regionId?: string) {
  const packages = await prisma.package.findMany({
    where: {
      currentStatus: { in: ["added_to_bag", "in_transit"] },
      ...(regionId && { currentRegionId: regionId }),
    },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      currentRegion: { select: { regionCode: true, regionName: true } },
      bagPackages: {
        include: {
          bag: {
            select: {
              bagCode: true,
              status: true,
              direction: true,
              truckBags: {
                include: {
                  truckSchedule: {
                    select: {
                      status: true,
                      scheduledDeparture: true,
                      actualDeparture: true,
                      truck: { select: { truckCode: true } },
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { addedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { count: packages.length, data: packages };
}

// ─── Section: Delayed ────────────────────────────────────────────────────────
/**
 * All packages with status = "delayed", showing the delay reason.
 */
export async function getDelayed(regionId?: string) {
  const packages = await prisma.package.findMany({
    where: {
      currentStatus: "delayed",
      ...(regionId && { currentRegionId: regionId }),
    },
    include: {
      originRegion: { select: { regionCode: true, regionName: true } },
      destRegion: { select: { regionCode: true, regionName: true } },
      currentRegion: { select: { regionCode: true, regionName: true } },
      statusHistory: {
        where: { status: "delayed" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          region: { select: { regionCode: true, regionName: true } },
          bag: { select: { bagCode: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { count: packages.length, data: packages };
}
