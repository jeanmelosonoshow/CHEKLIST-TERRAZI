import { sql as postgres } from "@/db";
import { executeDashboardQuery, prepareDashboardQuery, validateDashboardQuery, type DashboardQueryContext } from "./dashboard-query";

export type ReportDefinitionConfig = { dataSource: "firebird" | "postgres" | "hybrid"; primarySql: string; secondarySql?: string | null; combineMode: "append" | "join"; joinFields: string[] };

async function executePostgresQuery(query: string, context: DashboardQueryContext, limit: number) {
  const validation = validateDashboardQuery(query);
  if (!validation.valid) throw Object.assign(new Error(validation.error), { status: 400 });
  const prepared = prepareDashboardQuery(validation.sql, context, (position) => `$${position}`);
  const rows = await postgres.unsafe<Record<string, unknown>[]>(prepared.sql, prepared.params);
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}

export async function executeReport(config: ReportDefinitionConfig, context: DashboardQueryContext, limit = 1000) {
  if (config.dataSource === "firebird") return executeDashboardQuery(config.primarySql, context, limit);
  if (config.dataSource === "postgres") return executePostgresQuery(config.primarySql, context, limit);
  const [firebird, postgresResult] = await Promise.all([executeDashboardQuery(config.primarySql, context, limit), executePostgresQuery(config.secondarySql || "", context, limit)]);
  const rows = config.combineMode === "join" ? joinRows(firebird.rows, postgresResult.rows, config.joinFields) : [...firebird.rows, ...postgresResult.rows];
  return { rows: rows.slice(0, limit), truncated: firebird.truncated || postgresResult.truncated || rows.length > limit };
}

function joinRows(first: Record<string, unknown>[], second: Record<string, unknown>[], fields: string[]) {
  const read = (row: Record<string, unknown>, field: string) => row[field] ?? row[Object.keys(row).find((key) => key.toLowerCase() === field.toLowerCase()) || ""];
  const key = (row: Record<string, unknown>) => fields.map((field) => String(read(row, field) ?? "")).join("\u001f");
  const secondByKey = new Map(second.map((row) => [key(row), row])); const used = new Set<string>();
  const merged = first.map((row) => { const rowKey = key(row); used.add(rowKey); return { ...row, ...(secondByKey.get(rowKey) || {}) }; });
  for (const row of second) if (!used.has(key(row))) merged.push(row);
  return merged;
}
