import { DsqlSigner } from "@aws-sdk/dsql-signer";
import postgres from "postgres";

/**
 * Adds indexes to the hot filter/sort columns used by the command center,
 * incident detail, map, and realtime queries.
 *
 * Aurora DSQL requires `CREATE INDEX ASYNC` (synchronous index creation is
 * rejected) and does NOT allow ASC/DESC ordering in index definitions, so all
 * statements below follow those rules. Each statement runs on its own (DSQL
 * does not allow multiple DDL statements in a single transaction).
 *
 * Safe to run multiple times — every index uses IF NOT EXISTS.
 */
const INDEXES = [
  // incidents: filtered by status, sorted by severity/updatedAt
  `CREATE INDEX ASYNC IF NOT EXISTS idx_incidents_status ON incidents (status)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_incidents_updated_at ON incidents (updated_at)`,
  // resources: status aggregation + currentIncident lookups
  `CREATE INDEX ASYNC IF NOT EXISTS idx_resources_status ON resources (status)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_resources_current_incident ON resources (current_incident_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_resources_agency ON resources (agency_id)`,
  // resource_assignments: looked up by resource/incident, filtered by released_at
  `CREATE INDEX ASYNC IF NOT EXISTS idx_assignments_resource ON resource_assignments (resource_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_assignments_incident ON resource_assignments (incident_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_assignments_released ON resource_assignments (released_at)`,
  // timeline_events: per-incident lookups + global recent feed by created_at
  `CREATE INDEX ASYNC IF NOT EXISTS idx_timeline_incident ON timeline_events (incident_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_timeline_created_at ON timeline_events (created_at)`,
  // incident_updates: per-incident lookups
  `CREATE INDEX ASYNC IF NOT EXISTS idx_incident_updates_incident ON incident_updates (incident_id)`,
  // presence: per-incident + per-user lookups
  `CREATE INDEX ASYNC IF NOT EXISTS idx_presence_incident ON presence (incident_id)`,
  `CREATE INDEX ASYNC IF NOT EXISTS idx_presence_user ON presence (user_id)`,
  // conflict_logs: recent feed by resolved_at
  `CREATE INDEX ASYNC IF NOT EXISTS idx_conflict_logs_resolved ON conflict_logs (resolved_at)`,
  // users: login lookup by email
  `CREATE INDEX ASYNC IF NOT EXISTS idx_users_email ON users (email)`,
];

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

  console.log("Creating indexes...");
  for (const statement of INDEXES) {
    try {
      await client.unsafe(statement);
      console.log(`  ok: ${statement}`);
    } catch (e) {
      console.error(`  failed: ${statement}`);
      console.error(`    ${(e as Error).message}`);
    }
  }

  console.log("\nDone. Note: DSQL builds ASYNC indexes in the background.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
