import { prisma } from "../config/database";

export async function getDashboard() {
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
