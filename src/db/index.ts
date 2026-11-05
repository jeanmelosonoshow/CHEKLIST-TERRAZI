import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (!connectionString && !isProductionBuild) throw new Error("DATABASE_URL is not configured.");

  // Next.js evaluates route modules while producing a build. postgres-js only
  // opens a connection when a query runs, so a non-routable placeholder keeps
  // builds independent from production secrets without hiding runtime errors.
  const buildOnlyUrl = "postgres://build:build@127.0.0.1:1/build";
  return postgres(connectionString ?? buildOnlyUrl, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    connect_timeout: 5,
  });
}

export const sql = globalForDb.sql ?? getClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
