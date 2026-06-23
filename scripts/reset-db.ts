import { DsqlSigner } from "@aws-sdk/dsql-signer";
import postgres from "postgres";

async function main() {
  const hostname = process.env.DSQL_HOSTNAME;
  const connectionString = process.env.DATABASE_URL;

  let client: ReturnType<typeof postgres>;

  if (hostname) {
    const region = process.env.AWS_REGION ?? "us-east-2";
    const signer = new DsqlSigner({ hostname, region });
    const token = await signer.getDbConnectAdminAuthToken();
    client = postgres({
      host: hostname,
      port: 5432,
      database: "postgres",
      username: "admin",
      ssl: { rejectUnauthorized: true },
      password: token,
      max: 1,
      prepare: false,
    });
  } else if (connectionString) {
    client = postgres(connectionString, { max: 1, prepare: false });
  } else {
    console.error("DSQL_HOSTNAME or DATABASE_URL is required");
    process.exit(1);
  }

  const tables = [
    "road_closures",
    "evacuation_zones",
    "audit_logs",
    "consistency_metrics",
    "simulations",
    "presence",
    "conflict_logs",
    "timeline_events",
    "resource_assignments",
    "resources",
    "incident_updates",
    "incidents",
    "users",
    "agencies",
  ];

  console.log("🗑️  Dropping all tables...");
  for (const table of tables) {
    await client.unsafe(`DROP TABLE IF EXISTS "${table}"`);
    console.log(`  ✓ dropped ${table}`);
  }

  console.log("\n✅ Database reset complete. Run npm run db:push next.");
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
