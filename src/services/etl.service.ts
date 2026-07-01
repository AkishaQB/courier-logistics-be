import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function runLogisticsPushEtl() {
  try {
    // 1. Get or create the ETL state
    let etlState = await prisma.etlState.findFirst();
    if (!etlState) {
      etlState = await prisma.etlState.create({
        data: { lastPushedAt: new Date(0) },
      });
    }
    console.log('etlState', etlState)
    const lastPushedAt = etlState.lastPushedAt;

    // 2. Fetch package status history records after lastPushedAt
    const updates = await prisma.packageStatusHistory.findMany({
      where: {
        createdAt: { gt: lastPushedAt },
      },
      include: {
        package: { select: { trackingId: true } },
        region: { select: { regionCode: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    console.log('updates', updates)

    if (updates.length === 0) return;

    console.log(`[Push ETL] Found ${updates.length} new status history records to push...`);

    // 3. Format payload
    const formattedUpdates = updates.map((history) => ({
      trackingId: history.package.trackingId,
      status: history.status,
      regionCode: history.region?.regionCode || undefined,
      notes: history.notes || undefined,
      timestamp: history.createdAt.toISOString(),
    }));
    console.log('formattedUpdates', formattedUpdates)

    // 4. Send bulk payload to Track BE raw updates endpoint
    const trackBeUrl = process.env.TRACK_BE_RAW_UPDATES_URL || "http://localhost:3001/api/internal/raw-updates";
    console.log('trackBeUrl', trackBeUrl)
    const response = await fetch(trackBeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates: formattedUpdates }),
    });
    console.log('response', response)

    if (!response || !response.ok) {
      console.error(`[Push ETL] Track BE raw updates API failed with status ${response.status}`);
      return;
    }

    const resData = await response.json();
        console.log('resData', resData)

    console.log(`[Push ETL] Successfully pushed ${updates.length} updates. Track BE saved count: ${resData.count}`);

    // 5. Update lastPushedAt to the maximum createdAt in the batch
    const maxCreatedAt = updates[updates.length - 1].createdAt;
    await prisma.etlState.update({
      where: { id: etlState.id },
      data: { lastPushedAt: maxCreatedAt },
    });

  } catch (error) {
    console.error("[Push ETL] Error in logistics push ETL job:", error);
  }
}

export function startLogisticsPushEtlInterval(intervalMs: number = 60000) {
  // Run push ETL immediately on start, then periodically
  void runLogisticsPushEtl();
  setInterval(() => {
    void runLogisticsPushEtl();
  }, intervalMs);
  console.log(`[Push ETL] Logistics push ETL job started (every ${intervalMs / 1000}s)`);
}
