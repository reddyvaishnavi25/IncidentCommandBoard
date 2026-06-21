import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

function createDb() {
  if (!connectionString) {
    return null;
  }
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return drizzle(client, { schema });
}

export const db = createDb();

export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env to connect to Aurora DSQL."
    );
  }
  return db;
}

export * from "./schema";
