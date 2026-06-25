-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('to_be_picked_up', 'picked_up', 'added_to_bag', 'in_transit', 'arrived', 'scheduled_for_delivery', 'out_for_delivery', 'delivered', 'delayed');

-- CreateEnum
CREATE TYPE "BagStatus" AS ENUM ('open', 'sealed', 'in_transit', 'delivered');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('idle', 'loading', 'in_transit', 'delayed');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('scheduled', 'departed', 'delayed', 'cancelled');

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "region_code" TEXT NOT NULL,
    "region_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_region_id" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "tracking_id" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_address" TEXT NOT NULL,
    "receiver_name" TEXT NOT NULL,
    "receiver_address" TEXT NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "current_status" "PackageStatus" NOT NULL DEFAULT 'to_be_picked_up',
    "delay_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "origin_region_id" TEXT NOT NULL,
    "dest_region_id" TEXT NOT NULL,
    "current_region_id" TEXT NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bags" (
    "id" TEXT NOT NULL,
    "bag_code" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" "BagStatus" NOT NULL DEFAULT 'open',
    "sealed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origin_region_id" TEXT NOT NULL,
    "dest_region_id" TEXT NOT NULL,

    CONSTRAINT "bags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_packages" (
    "id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bag_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,

    CONSTRAINT "bag_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "truck_code" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "TruckStatus" NOT NULL DEFAULT 'idle',
    "delay_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_region_id" TEXT NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_schedules" (
    "id" TEXT NOT NULL,
    "scheduled_departure" TIMESTAMP(3) NOT NULL,
    "actual_departure" TIMESTAMP(3),
    "status" "ScheduleStatus" NOT NULL DEFAULT 'scheduled',
    "delay_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truck_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,

    CONSTRAINT "truck_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_bags" (
    "id" TEXT NOT NULL,
    "loaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "truck_schedule_id" TEXT NOT NULL,
    "bag_id" TEXT NOT NULL,

    CONSTRAINT "truck_bags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_status_history" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT NOT NULL,
    "region_id" TEXT,
    "bag_id" TEXT,

    CONSTRAINT "package_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_region_code_key" ON "regions"("region_code");

-- CreateIndex
CREATE UNIQUE INDEX "packages_tracking_id_key" ON "packages"("tracking_id");

-- CreateIndex
CREATE UNIQUE INDEX "bags_bag_code_key" ON "bags"("bag_code");

-- CreateIndex
CREATE UNIQUE INDEX "bag_packages_bag_id_package_id_key" ON "bag_packages"("bag_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_truck_code_key" ON "trucks"("truck_code");

-- CreateIndex
CREATE UNIQUE INDEX "truck_bags_truck_schedule_id_bag_id_key" ON "truck_bags"("truck_schedule_id", "bag_id");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_region_id_fkey" FOREIGN KEY ("parent_region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_origin_region_id_fkey" FOREIGN KEY ("origin_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_dest_region_id_fkey" FOREIGN KEY ("dest_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_current_region_id_fkey" FOREIGN KEY ("current_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bags" ADD CONSTRAINT "bags_origin_region_id_fkey" FOREIGN KEY ("origin_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bags" ADD CONSTRAINT "bags_dest_region_id_fkey" FOREIGN KEY ("dest_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_packages" ADD CONSTRAINT "bag_packages_bag_id_fkey" FOREIGN KEY ("bag_id") REFERENCES "bags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_packages" ADD CONSTRAINT "bag_packages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_current_region_id_fkey" FOREIGN KEY ("current_region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_schedules" ADD CONSTRAINT "truck_schedules_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_schedules" ADD CONSTRAINT "truck_schedules_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_bags" ADD CONSTRAINT "truck_bags_truck_schedule_id_fkey" FOREIGN KEY ("truck_schedule_id") REFERENCES "truck_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_bags" ADD CONSTRAINT "truck_bags_bag_id_fkey" FOREIGN KEY ("bag_id") REFERENCES "bags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_status_history" ADD CONSTRAINT "package_status_history_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_status_history" ADD CONSTRAINT "package_status_history_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_status_history" ADD CONSTRAINT "package_status_history_bag_id_fkey" FOREIGN KEY ("bag_id") REFERENCES "bags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
