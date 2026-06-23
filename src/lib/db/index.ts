import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
let _client: ReturnType<typeof postgres> | null = null;
let _tokenExpiresAt = 0;
let _refreshPromise: Promise<DrizzleDb> | null = null;

async function buildDb(): Promise<DrizzleDb> {
  const hostname = process.env.DSQL_HOSTNAME;

  if (hostname) {
    const { DsqlSigner } = await import("@aws-sdk/dsql-signer");
    const region = process.env.AWS_REGION ?? "us-east-2";
    const signer = new DsqlSigner({ hostname, region });
    const token = await signer.getDbConnectAdminAuthToken();
    const url = `postgresql://admin:${encodeURIComponent(token)}@${hostname}:5432/postgres?sslmode=require`;
    _tokenExpiresAt = Date.now() + 12 * 60 * 1000; // refresh 3 min before expiry
    if (_client) await _client.end().catch(() => {});
    _client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10, prepare: false });
    return drizzle(_client, { schema });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DSQL_HOSTNAME is not configured. Set it in .env.");
  }
  if (_client) await _client.end().catch(() => {});
  _client = postgres(connectionString, { max: 10, idle_timeout: 20, connect_timeout: 10, prepare: false });
  _tokenExpiresAt = Infinity;
  return drizzle(_client, { schema });
}

export async function requireDb(): Promise<DrizzleDb> {
  if (_db && Date.now() < _tokenExpiresAt) return _db;

  if (!_refreshPromise) {
    _refreshPromise = buildDb().then((db) => {
      _db = db;
      _refreshPromise = null;
      return db;
    }).catch((err) => {
      _refreshPromise = null;
      throw err;
    });
  }
  return _refreshPromise;
}

// kept for backward compat with drizzle.config.ts / non-async contexts
export const db = null;

export * from "./schema";
