import { PrismaClient } from "../src/generated/prisma/client";
import type { Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Region hierarchy ───────────────────────────────────
// Top-level regions, then sub-regions under each
const regions = [
  { regionCode: "NORTH", regionName: "Northern Region" },
  { regionCode: "SOUTH", regionName: "Southern Region" },
  { regionCode: "EAST", regionName: "Eastern Region" },
  { regionCode: "WEST", regionName: "Western Region" },
  { regionCode: "CENTRAL", regionName: "Central Hub" },
];

const subRegions: Record<string, { regionCode: string; regionName: string }[]> = {
  NORTH: [
    { regionCode: "NORTH-A", regionName: "North Sector A" },
    { regionCode: "NORTH-B", regionName: "North Sector B" },
  ],
  SOUTH: [
    { regionCode: "SOUTH-A", regionName: "South Sector A" },
    { regionCode: "SOUTH-B", regionName: "South Sector B" },
  ],
  EAST: [
    { regionCode: "EAST-A", regionName: "East Sector A" },
  ],
  WEST: [
    { regionCode: "WEST-A", regionName: "West Sector A" },
  ],
};

// ─── Sample trucks ──────────────────────────────────────
const trucks = [
  { truckCode: "TRK-001", capacity: 20 },
  { truckCode: "TRK-002", capacity: 15 },
  { truckCode: "TRK-003", capacity: 25 },
  { truckCode: "TRK-004", capacity: 10 },
];

async function main() {
  // ── Seed top-level regions ────────────────────────────
  console.log("🌱 Seeding regions...");

  const regionMap = new Map<string, string>(); // regionCode → id

  for (const region of regions) {
    const result = await prisma.region.upsert({
      where: { regionCode: region.regionCode } as Prisma.RegionWhereUniqueInput,
      update: {},
      create: region,
    });
    regionMap.set(result.regionCode, result.id);
    console.log(`  ✅ ${result.regionCode} — ${result.regionName} (${result.id})`);
  }

  // ── Seed sub-regions ──────────────────────────────────
  console.log("🌱 Seeding sub-regions...");

  for (const [parentCode, subs] of Object.entries(subRegions)) {
    const parentId = regionMap.get(parentCode);
    if (!parentId) {
      console.warn(`  ⚠️ Parent region ${parentCode} not found, skipping sub-regions`);
      continue;
    }

    for (const sub of subs) {
      const result = await prisma.region.upsert({
        where: { regionCode: sub.regionCode } as Prisma.RegionWhereUniqueInput,
        update: {},
        create: {
          ...sub,
          parentRegionId: parentId,
        },
      });
      console.log(`  ✅ ${result.regionCode} — ${result.regionName} (parent: ${parentCode})`);
    }
  }

  // ── Seed trucks (assign to CENTRAL hub) ───────────────
  console.log("🌱 Seeding trucks...");

  const centralId = regionMap.get("CENTRAL");
  if (!centralId) {
    console.error("  ❌ CENTRAL region not found — cannot seed trucks");
    return;
  }

  for (const truck of trucks) {
    const result = await prisma.truck.upsert({
      where: { truckCode: truck.truckCode } as Prisma.TruckWhereUniqueInput,
      update: {},
      create: {
        ...truck,
        currentRegionId: centralId,
      },
    });
    console.log(`  ✅ ${result.truckCode} — capacity: ${result.capacity} (${result.id})`);
  }

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
