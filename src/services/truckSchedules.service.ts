import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
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
    prisma.region.findUnique({ where: { id: payload.regionId } }),
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
      regionId: payload.regionId,
      scheduledDeparture: new Date(payload.scheduledDeparture),
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

  await prisma.$transaction(async (tx) => {
    await tx.truckBag.create({
      data: { truckScheduleId: scheduleId, bagId: payload.bagId },
    });

    const bagPackages = await tx.bagPackage.findMany({
      where: { bagId: payload.bagId },
      select: { packageId: true },
    });

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

  await prisma.$transaction(async (tx) => {
    await tx.truckSchedule.update({
      where: { id },
      data: { status: "departed", actualDeparture: departureTime },
    });
    await tx.truck.update({
      where: { id: schedule.truckId },
      data: { status: "in_transit" },
    });
  });

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

  const updated = await prisma.truckSchedule.update({
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
    await prisma.truck.update({
      where: { id: schedule.truckId },
      data: { status: "idle" },
    });
  }

  return updated;
}
