import { sql } from "@/db";
import type { User } from "@/db/schema";
import { prepareDashboardQuery, validateDashboardQuery } from "./dashboard-query";
import { queryFirebirdGateway } from "./firebird-gateway";
import { normalizeDecisionValue } from "./checklist-flow";

export function readAutomationField(row: Record<string, unknown>, name: string) {
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}

export function mapAutomationItems(rows: Record<string, unknown>[], mapping: { productCodeField?: string | null; productDescriptionField?: string | null; productQuantityField?: string | null }) {
  if (!mapping.productCodeField || !mapping.productDescriptionField || !mapping.productQuantityField) return [];
  return rows.flatMap((row) => {
    const code = readAutomationField(row, mapping.productCodeField!); const description = readAutomationField(row, mapping.productDescriptionField!); const quantity = readAutomationField(row, mapping.productQuantityField!);
    if (code === undefined || code === null || description === undefined || description === null) return [];
    return [{ code: String(code), description: String(description), quantity: typeof quantity === "number" ? quantity : String(quantity ?? "") }];
  });
}

export async function executeFlowAutomation(node: { automationSource: "postgres" | "firebird" | null; querySql: string | null; resultField: string }, execution: { saleNumber: string; branchId: string }, user: User) {
  if (!node.automationSource || !node.querySql) throw Object.assign(new Error("Decisão automática sem consulta configurada."), { status: 409 });
  const validation = validateDashboardQuery(node.querySql);
  if (!validation.valid) throw Object.assign(new Error(validation.error), { status: 400 });
  const context = { branchId: execution.branchId, employeeId: user.employeeId, category: user.category, saleNumber: execution.saleNumber };
  let rows: Record<string, unknown>[];
  if (node.automationSource === "firebird") {
    const prepared = prepareDashboardQuery(validation.sql, context);
    rows = await queryFirebirdGateway<Record<string, unknown>>(prepared.sql, prepared.params, { timeoutMs: 60_000 });
  } else {
    const prepared = prepareDashboardQuery(validation.sql, context, (position) => `$${position}`);
    rows = Array.from(await sql.unsafe<Record<string, unknown>[]>(prepared.sql, prepared.params));
  }
  if (!rows.length) throw Object.assign(new Error("A consulta automática não retornou resultado."), { status: 409 });
  const value = readAutomationField(rows[0], node.resultField);
  if (value === undefined || value === null) throw Object.assign(new Error(`O campo ${node.resultField} não foi retornado pela consulta.`), { status: 409 });
  return { value: normalizeDecisionValue(value), row: rows[0], rows };
}
