import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log("🌱 Seeding Crisis Twin database...");

  const passwordHash = await bcrypt.hash("demo123", 10);

  const agencyData = [
    { name: "Travis County Sheriff", type: "police" as const, callSign: "TCSO" },
    { name: "Austin Fire Department", type: "fire" as const, callSign: "AFD" },
    { name: "STAR Flight EMS", type: "ems" as const, callSign: "STAR" },
    { name: "Capital Area Dispatch", type: "dispatch" as const, callSign: "CAD" },
    { name: "Travis County OEM", type: "emergency_management" as const, callSign: "OEM" },
  ];

  const insertedAgencies = await db.insert(schema.agencies).values(agencyData).returning();
  console.log(`  ✓ ${insertedAgencies.length} agencies`);

  const agencyMap = Object.fromEntries(insertedAgencies.map((a) => [a.type, a]));

  const userData = [
    { email: "police@crisis-twin.demo", name: "Sgt. Marcus Chen", role: "police" as const, agencyId: agencyMap.police.id, badgeNumber: "4521" },
    { email: "fire@crisis-twin.demo", name: "Capt. Sarah Mitchell", role: "fire" as const, agencyId: agencyMap.fire.id, badgeNumber: "F-892" },
    { email: "ems@crisis-twin.demo", name: "Paramedic James Okonkwo", role: "ems" as const, agencyId: agencyMap.ems.id, badgeNumber: "M-334" },
    { email: "dispatch@crisis-twin.demo", name: "Dispatcher Alex Rivera", role: "dispatch" as const, agencyId: agencyMap.dispatch.id, badgeNumber: "D-101" },
    { email: "dispatch2@crisis-twin.demo", name: "Dispatcher Jordan Lee", role: "dispatch" as const, agencyId: agencyMap.dispatch.id, badgeNumber: "D-102" },
    { email: "em@crisis-twin.demo", name: "Director Patricia Walsh", role: "emergency_manager" as const, agencyId: agencyMap.emergency_management.id, badgeNumber: "EM-001" },
  ];

  const insertedUsers = await db
    .insert(schema.users)
    .values(userData.map((u) => ({ ...u, passwordHash })))
    .returning();
  console.log(`  ✓ ${insertedUsers.length} users (password: demo123)`);

  const baseLat = 30.2672;
  const baseLng = -97.7431;

  const resourceTemplates = [
    ...Array.from({ length: 12 }, (_, i) => ({
      callSign: `EMS-${String(i + 1).padStart(2, "0")}`,
      name: `Ambulance Unit ${i + 1}`,
      type: "ambulance" as const,
      agencyId: agencyMap.ems.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.15).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.15).toFixed(7),
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      callSign: `ENG-${String(i + 1).padStart(2, "0")}`,
      name: `Fire Engine ${i + 1}`,
      type: "fire_engine" as const,
      agencyId: agencyMap.fire.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.15).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.15).toFixed(7),
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
      callSign: `UNIT-${String(i + 1).padStart(2, "0")}`,
      name: `Patrol Unit ${i + 1}`,
      type: "police_vehicle" as const,
      agencyId: agencyMap.police.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.15).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.15).toFixed(7),
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      callSign: `HAZ-${String(i + 1).padStart(2, "0")}`,
      name: `Hazmat Team ${i + 1}`,
      type: "hazmat_team" as const,
      agencyId: agencyMap.fire.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.1).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.1).toFixed(7),
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      callSign: `SAR-${String(i + 1).padStart(2, "0")}`,
      name: `Search & Rescue ${i + 1}`,
      type: "search_rescue" as const,
      agencyId: agencyMap.fire.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.1).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.1).toFixed(7),
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      callSign: `RSC-${String(i + 1).padStart(2, "0")}`,
      name: `Rescue Squad ${i + 1}`,
      type: "rescue_team" as const,
      agencyId: agencyMap.fire.id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.1).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.1).toFixed(7),
    })),
  ];

  const insertedResources = await db
    .insert(schema.resources)
    .values(resourceTemplates.map((r) => ({ ...r, status: "available" as const })))
    .returning();
  console.log(`  ✓ ${insertedResources.length} resources`);

  const dispatchUser = insertedUsers.find((u) => u.email === "dispatch@crisis-twin.demo")!;

  const [incident1] = await db
    .insert(schema.incidents)
    .values({
      incidentNumber: "INC-2026-4892",
      title: "Multi-Vehicle Collision — I-35",
      description: "5-vehicle pileup with injuries. Lane closures in effect.",
      status: "active",
      severity: "high",
      location: "I-35 Northbound, Mile Marker 234",
      latitude: (baseLat + 0.05).toFixed(7),
      longitude: (baseLng - 0.03).toFixed(7),
      casualties: 3,
      injuries: 8,
      createdById: dispatchUser.id,
    })
    .returning();

  const [incident2] = await db
    .insert(schema.incidents)
    .values({
      incidentNumber: "INC-2026-4893",
      title: "Structure Fire — Downtown",
      description: "Commercial building fire, possible occupants trapped.",
      status: "active",
      severity: "critical",
      location: "412 Congress Ave, Austin",
      latitude: (baseLat - 0.02).toFixed(7),
      longitude: (baseLng + 0.01).toFixed(7),
      casualties: 0,
      injuries: 2,
      createdById: dispatchUser.id,
    })
    .returning();

  console.log(`  ✓ 2 active incidents`);

  await db.insert(schema.evacuationZones).values([
    {
      name: "Industrial District Perimeter",
      incidentId: incident2.id,
      latitude: (baseLat - 0.02).toFixed(7),
      longitude: (baseLng + 0.01).toFixed(7),
      radiusMeters: 1500,
    },
  ]);

  await db.insert(schema.roadClosures).values([
    {
      name: "Congress Ave Closure",
      incidentId: incident2.id,
      startLat: (baseLat - 0.025).toFixed(7),
      startLng: (baseLng + 0.005).toFixed(7),
      endLat: (baseLat - 0.015).toFixed(7),
      endLng: (baseLng + 0.015).toFixed(7),
      reason: "Structure fire response",
    },
  ]);

  await db.insert(schema.timelineEvents).values([
    {
      incidentId: incident1.id,
      eventType: "incident_created",
      title: "Incident reported: Multi-Vehicle Collision",
      userId: dispatchUser.id,
      agencyId: agencyMap.dispatch.id,
    },
    {
      incidentId: incident2.id,
      eventType: "incident_created",
      title: "Incident reported: Structure Fire",
      userId: dispatchUser.id,
      agencyId: agencyMap.dispatch.id,
    },
  ]);

  await db.insert(schema.consistencyMetrics).values({});
  console.log(`  ✓ Consistency metrics initialized`);

  console.log("\n✅ Seed complete!");
  console.log("\nDemo accounts (password: demo123):");
  insertedUsers.forEach((u) => console.log(`  ${u.role.padEnd(20)} ${u.email}`));
}

seed()
  .then(() => client.end())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
