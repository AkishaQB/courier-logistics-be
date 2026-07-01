-- AlterEnum
ALTER TYPE "ScheduleStatus" ADD VALUE 'arrived';

-- CreateTable
CREATE TABLE "etl_state" (
    "id" TEXT NOT NULL,
    "last_pushed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etl_state_pkey" PRIMARY KEY ("id")
);
