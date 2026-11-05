import { and, asc, eq } from "drizzle-orm";
import { db, sql } from "@/db";
import { syncedRecords, syncedSources, type User } from "@/db/schema";
import { prepareDashboardQuery, validateDashboardQuery } from "./dashboard-query";
import { queryFirebirdGateway } from "./firebird-gateway";

export type OptionItem = { value: string; label: string };
export type OptionSource = typeof syncedSources.$inferSelect;

function field(row: Record<string, unknown>, name: string) {
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}

function normalizeOptions(rows: Record<string, unknown>[], valueField: string, labelField: string) {
  const seen = new Set<string>();
  const options: OptionItem[] = [];
  for (const row of rows) {
    const rawValue = field(row, valueField);
    const rawLabel = field(row, labelField);
    if (rawValue === null || rawValue === undefined || rawLabel === null || rawLabel === undefined) continue;
    const value = String(rawValue);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: String(rawLabel) });
    if (options.length >= 1_000) break;
  }
  return options;
}

export async function resolveOptionSource(source: OptionSource, user: User): Promise<OptionItem[]> {
  if (source.sourceType === "static") return source.staticOptions;
  if (source.sourceType === "synchronized") {
    const records = await db.select({ value: syncedRecords.externalId, label: syncedRecords.label })
      .from(syncedRecords)
      .where(and(eq(syncedRecords.sourceKey, source.key), eq(syncedRecords.active, true)))
      .orderBy(asc(syncedRecords.label));
    return records;
  }
  if (!source.querySql) return [];
  const validation = validateDashboardQuery(source.querySql);
  if (!validation.valid) throw Object.assign(new Error(validation.error), { status: 400 });
  const context = { branchId: user.branchId, employeeId: user.employeeId, category: user.category };
  if (source.sourceType === "firebird") {
    const prepared = prepareDashboardQuery(validation.sql, context);
    const rows = await queryFirebirdGateway<Record<string, unknown>>(prepared.sql, prepared.params, { timeoutMs: 60_000 });
    return normalizeOptions(rows, source.resultValueField, source.resultLabelField);
  }
  const prepared = prepareDashboardQuery(validation.sql, context, (position) => `$${position}`);
  const rows = await sql.unsafe<Record<string, unknown>[]>(prepared.sql, prepared.params);
  return normalizeOptions(Array.from(rows), source.resultValueField, source.resultLabelField);
}

export async function getOptionSource(key: string) {
  const [source] = await db.select().from(syncedSources).where(eq(syncedSources.key, key)).limit(1);
  return source ?? null;
}
