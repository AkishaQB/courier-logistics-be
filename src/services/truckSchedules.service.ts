import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { firePackageStatusWebhook } from "../utils/webhook";
import { z } from "zod";
import {
  createScheduleSchema,
  departSchema,
  listQuerySchema,
  loadBagSchema,
  updateScheduleSchema,
} from "../schemas/truckSchedules.schemas";

export type CreateTruckScheduleInput = z.infer<typeof createScheduleSchema>;
export type LoadBagInput = z.infer<typeof loadBagSchema>;
export type DepartTruckScheduleInput = z.infer<typeof departSchema>;
export type UpdateTruckScheduleInput = z.infer<typeof updateScheduleSchema>;
export type GetTruckSchedulesOptions = z.infer<typeof listQuerySchema>;

export async function getTruckSchedules(opts: GetTruckSchedulesOptions) {
  const { status, truckId, regionId, page, limit } = opts;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(truckId && { truckId }),
    ...(regionId && { regionId }),
  };

  const [schedules, total] = await Promise.all([
    prisma.truckSchedule.findMany({
      where,
      include: {
        truck: { select: { truckCode: true, status: true, capacity: true } },
        region: { select: { regionCode: true, regionName: true } },
        _count: { select: { truckBags: true } },
        truckBags: {
          include: {
            bag: {
              include: {
                originRegion: { select: { regionCode: true, regionName: true } },
                destRegion: { select: { regionCode: true, regionName: true } },
                _count: { select: { bagPackages: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledDeparture: "desc" },
      skip,
      take: limit,
    }),
    prisma.truckSchedule.count({ where }),
  ]);

  return {
    data: schedules,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTruckScheduleById(id: string) {
  const schedule = await prisma.truckSchedule.findUnique({
    where: { id },
    include: {
      truck: { include: { currentRegion: true } },
      region: true,
      truckBags: {
        include: {
          bag: {
            include: {
              originRegion: { select: { regionCode: true, regionName: true } },
              destRegion: { select: { regionCode: true, regionName: true } },
              _count: { select: { bagPackages: true } },
            },
          },
        },
        orderBy: { loadedAt: "asc" },
      },
    },
  });

  if (!schedule) {
    throw new AppError("Schedule not found", 404);
  }

  return schedule;
}

export async function createTruckSchedule(payload: CreateTruckScheduleInput) {
  const [truck, region] = await Promise.all([
    prisma.truck.findUnique({ where: { id: payload.truckId } }),
    prisma.region.findUnique({ where: { id: payload.originRegionId } }),
  ]);

  if (!truck) throw new AppError("Truck not found", 404);
  if (!region) throw new AppError("Region not found", 404);

  if (truck.status === "in_transit") {
    throw new AppError(
      "Truck is currently in transit and cannot be scheduled",
      400,
    );
  }

  const schedule = await prisma.truckSchedule.create({
    data: {
      truckId: payload.truckId,
      regionId: payload.originRegionId,
      scheduledDeparture: new Date(payload.departureTime),
      routeDescription: payload.routeDescription,
      estimatedArrivalTime: payload.estimatedArrivalTime
        ? new Date(payload.estimatedArrivalTime)
        : null,
    },
    include: {
      truck: { select: { truckCode: true } },
      region: { select: { regionCode: true, regionName: true } },
    },
  });

  await prisma.truck.update({
    where: { id: payload.truckId },
    data: { status: "loading" },
  });

  return schedule;
}

export async function loadBagOntoTruckSchedule(
  scheduleId: string,
  payload: LoadBagInput,
) {
  const [schedule, bag] = await Promise.all([
    prisma.truckSchedule.findUnique({ where: { id: scheduleId } }),
    prisma.bag.findUnique({
      where: { id: payload.bagId },
      include: { _count: { select: { bagPackages: true } } },
    }),
  ]);

  if (!schedule) throw new AppError("Schedule not found", 404);
  if (!bag) throw new AppError("Bag not found", 404);
  if (schedule.status !== "scheduled") {
    throw new AppError(
      "Can only load bags onto a scheduled (not departed/cancelled) run",
      400,
    );
  }
  if (bag.status !== "sealed") {
    throw new AppError("Only sealed bags can be loaded onto a truck", 400);
  }

  const loadedCount = await prisma.truckBag.count({
    where: { truckScheduleId: scheduleId },
  });
  const truck = await prisma.truck.findUnique({
    where: { id: schedule.truckId },
  });
  if (truck?.capacity && loadedCount >= truck.capacity) {
    throw new AppError(
      `Truck is at full capacity (${truck.capacity} bags)`,
      400,
    );
  }

  let updatedPackageIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.truckBag.create({
      data: { truckScheduleId: scheduleId, bagId: payload.bagId },
    });

    const bagPackages = await tx.bagPackage.findMany({
      where: { bagId: payload.bagId },
      select: { packageId: true },
    });

    updatedPackageIds = bagPackages.map((bp) => bp.packageId);

    for (const bp of bagPackages) {
      await tx.package.update({
        where: { id: bp.packageId },
        data: { currentStatus: "in_transit" },
      });
      await tx.packageStatusHistory.create({
        data: {
          packageId: bp.packageId,
          status: "in_transit",
          notes: `Loaded onto truck via bag ${bag.bagCode}`,
          bagId: payload.bagId,
          regionId: schedule.regionId,
        },
      });
    }
  });

  if (updatedPackageIds.length > 0) {
    const packages = await prisma.package.findMany({
      where: { id: { in: updatedPackageIds } },
      select: {
        trackingId: true,
        currentStatus: true,
        currentRegion: { select: { regionCode: true } },
      },
    });

    for (const pkg of packages) {
      firePackageStatusWebhook({
        trackingId: pkg.trackingId,
        status: pkg.currentStatus,
        regionCode: pkg.currentRegion.regionCode,
        notes: `Loaded onto truck via bag ${bag.bagCode}`,
      });
    }
  }

  return await prisma.truckSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      truck: { select: { truckCode: true, capacity: true } },
      truckBags: {
        include: {
          bag: {
            select: {
              bagCode: true,
              _count: { select: { bagPackages: true } },
            },
          },
        },
      },
      _count: { select: { truckBags: true } },
    },
  });
}

export async function departTruckSchedule(
  id: string,
  payload: DepartTruckScheduleInput,
) {
  const schedule = await prisma.truckSchedule.findUnique({
    where: { id },
    include: { _count: { select: { truckBags: true } } },
  });

  if (!schedule) throw new AppError("Schedule not found", 404);
  if (schedule.status !== "scheduled") {
    throw new AppError(`Schedule is '${schedule.status}' — cannot depart`, 400);
  }
  if (schedule._count.truckBags === 0) {
    throw new AppError("Cannot depart with no bags loaded", 400);
  }

  const departureTime = payload.actualDeparture
    ? new Date(payload.actualDeparture)
    : new Date();

  let updatedPackageIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.truckSchedule.update({
      where: { id },
      data: { status: "departed", actualDeparture: departureTime },
    });
    await tx.truck.update({
      where: { id: schedule.truckId },
      data: { status: "in_transit" },
    });

    const truckBags = await tx.truckBag.findMany({
      where: { truckScheduleId: id },
      select: { bagId: true },
    });
    const bagIds = truckBags.map((tb) => tb.bagId);
    if (bagIds.length > 0) {
      await tx.bag.updateMany({
        where: { id: { in: bagIds } },
        data: { status: "in_transit" },
      });

      const bagPackages = await tx.bagPackage.findMany({
        where: { bagId: { in: bagIds } },
        select: { packageId: true },
      });
      updatedPackageIds = bagPackages.map((bp) => bp.packageId);
    }
  });

  if (updatedPackageIds.length > 0) {
    const packages = await prisma.package.findMany({
      where: { id: { in: updatedPackageIds } },
      select: {
        trackingId: true,
        currentStatus: true,
        currentRegion: { select: { regionCode: true } },
      },
    });

    for (const pkg of packages) {
      firePackageStatusWebhook({
        trackingId: pkg.trackingId,
        status: pkg.currentStatus,
        regionCode: pkg.currentRegion.regionCode,
        notes: `Truck schedule departed (Actual Departure: ${departureTime.toISOString()})`,
      });
    }
  }

  return await prisma.truckSchedule.findUnique({
    where: { id },
    include: {
      truck: { select: { truckCode: true, status: true } },
      region: { select: { regionCode: true, regionName: true } },
      _count: { select: { truckBags: true } },
    },
  });
}

export async function updateTruckSchedule(
  id: string,
  payload: UpdateTruckScheduleInput,
) {
  const schedule = await prisma.truckSchedule.findUnique({ where: { id } });
  if (!schedule) throw new AppError("Schedule not found", 404);

  let updatedPackageIds: string[] = [];

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.truckSchedule.update({
      where: { id },
      data: {
        ...(payload.status && { status: payload.status }),
        ...(payload.delayReason !== undefined && {
          delayReason: payload.delayReason,
        }),
        ...(payload.actualDeparture && {
          actualDeparture: new Date(payload.actualDeparture),
        }),
      },
      include: {
        truck: { select: { truckCode: true, status: true } },
        region: { select: { regionCode: true, regionName: true } },
        _count: { select: { truckBags: true } },
      },
    });

    if (payload.status === "cancelled") {
      await tx.truck.update({
        where: { id: schedule.truckId },
        data: { status: "idle" },
      });

      const truckBags = await tx.truckBag.findMany({
        where: { truckScheduleId: id },
        select: { bagId: true },
      });
      const bagIds = truckBags.map((tb) => tb.bagId);
      if (bagIds.length > 0) {
        await tx.bag.updateMany({
          where: { id: { in: bagIds } },
          data: { status: "sealed" },
        });
      }
    }

    if (payload.status === "delayed") {
      const truckBags = await tx.truckBag.findMany({
        where: { truckScheduleId: id },
        include: {
          bag: {
            include: {
              bagPackages: {
                select: { packageId: true },
              },
            },
          },
        },
      });

      for (const tb of truckBags) {
        await tx.bag.update({
          where: { id: tb.bagId },
          data: { status: "delayed" },
        });

        for (const bp of tb.bag.bagPackages) {
          updatedPackageIds.push(bp.packageId);
          await tx.package.update({
            where: { id: bp.packageId },
            data: {
              currentStatus: "delayed",
              delayReason: payload.delayReason ?? "Truck schedule delayed",
            },
          });

          await tx.packageStatusHistory.create({
            data: {
              packageId: bp.packageId,
              status: "delayed",
              notes: payload.delayReason ?? `Delayed due to truck schedule delay for truck ${updated.truck.truckCode}`,
              bagId: tb.bagId,
              regionId: schedule.regionId,
            },
          });
        }
      }
    }

    if (payload.status === "arrived") {
      const truckBags = await tx.truckBag.findMany({
        where: { truckScheduleId: id },
        include: {
          bag: {
            include: {
              bagPackages: { select: { packageId: true } }
            }
          }
        }
      });

      const destinationRegionId = truckBags[0]?.bag?.destRegionId || schedule.regionId;

      await tx.truck.update({
        where: { id: schedule.truckId },
        data: { status: "idle", currentRegionId: destinationRegionId },
      });

      const bagIds = truckBags.map((tb) => tb.bagId);
      if (bagIds.length > 0) {
        await tx.bag.updateMany({
          where: { id: { in: bagIds } },
          data: { status: "delivered" },
        });

        for (const tb of truckBags) {
          const destId = tb.bag.destRegionId;
          const packageIds = tb.bag.bagPackages.map(bp => bp.packageId);

          if (packageIds.length > 0) {
            updatedPackageIds.push(...packageIds);

            await tx.package.updateMany({
              where: { id: { in: packageIds } },
              data: {
                currentStatus: "arrived",
                currentRegionId: destId
              }
            });

            for (const packageId of packageIds) {
              await tx.packageStatusHistory.create({
                data: {
                  packageId,
                  status: "arrived",
                  notes: `Arrived at destination hub via truck ${updated.truck.truckCode}`,
                  bagId: tb.bagId,
                  regionId: destId,
                }
              });
            }
          }
        }
      }
    }

    return updated;
  });

  if (updatedPackageIds.length > 0) {
    const packages = await prisma.package.findMany({
      where: { id: { in: updatedPackageIds } },
      select: {
        trackingId: true,
        currentStatus: true,
        currentRegion: { select: { regionCode: true } },
        delayReason: true,
      },
    });

    for (const pkg of packages) {
      firePackageStatusWebhook({
        trackingId: pkg.trackingId,
        status: pkg.currentStatus,
        regionCode: pkg.currentRegion.regionCode,
        notes: pkg.currentStatus === "delayed"
          ? (pkg.delayReason ?? "Truck schedule delayed")
          : `Truck schedule status updated to ${payload.status}`,
      });
    }
  }

  return updated;
}
