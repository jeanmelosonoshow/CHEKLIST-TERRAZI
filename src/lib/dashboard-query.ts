import { queryFirebirdGateway } from "./firebird-gateway";

const blockedStatements = /\b(insert|update|delete|merge|alter|drop|create|recreate|grant|revoke|execute|procedure|trigger|commit|rollback|savepoint|truncate)\b/i;
const sensitiveIdentifiers = /\b(senha|senhaweb|password|passwd|hash_senha)\b/i;
const allowedParameters = new Set([
  "idfilial",
  "idfuncionario",
  "categoria",
  "detalhe_valor",
  "detalhe_campo",
  "detalhe_serie",
  "numero_venda",
  "numerosaida",
]);

export type DashboardQueryContext = {
  branchId: string;
  employeeId: number;
  category: string | null;
  detailValue?: string;
  detailField?: string;
  detailSeries?: string;
  saleNumber?: string;
};

export function maskSqlLiteralsAndIdentifiers(sql: string) {
  let result = "";
  let state: "normal" | "literal" | "identifier" = "normal";
  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];
    const next = sql[index + 1];
    if (state === "normal" && current === "'") { state = "literal"; result += " "; continue; }
    if (state === "normal" && current === '"') { state = "identifier"; result += " "; continue; }
    if (state === "literal") {
      if (current === "'" && next === "'") { result += "  "; index += 1; continue; }
      result += current === "\n" ? "\n" : " ";
      if (current === "'") state = "normal";
      continue;
    }
    if (state === "identifier") {
      if (current === '"' && next === '"') { result += "  "; index += 1; continue; }
      result += current === "\n" ? "\n" : " ";
      if (current === '"') state = "normal";
      continue;
    }
    result += current;
  }
  return result;
}

export function validateDashboardQuery(input: string) {
  const sql = input.trim();
  const inspectable = maskSqlLiteralsAndIdentifiers(sql).trim();
  const withoutStringLiterals = sql.replace(/'(?:''|[^'])*'/g, "''");
  if (!/^(select|with)\b/i.test(inspectable)) return { valid: false as const, error: "A consulta deve começar com SELECT ou WITH." };
  if (inspectable.includes(";") || /--|\/\*|\*\//.test(inspectable)) return { valid: false as const, error: "Use uma única consulta, sem ponto e vírgula ou comentários SQL." };
  if (blockedStatements.test(inspectable)) return { valid: false as const, error: "Somente consultas de leitura são permitidas." };
  if (sensitiveIdentifiers.test(withoutStringLiterals)) return { valid: false as const, error: "Consultas do dashboard não podem acessar campos de senha." };

  const parameters = Array.from(inspectable.matchAll(/(^|[^:]):([a-z_][a-z0-9_]*)\b/gi), (match) => match[2].toLowerCase());
  const unknown = parameters.find((parameter) => !allowedParameters.has(parameter));
  if (unknown) return { valid: false as const, error: `Parâmetro não reconhecido: :${unknown}.` };
  return { valid: true as const, sql };
}

export function prepareDashboardQuery(
  sql: string,
  context: DashboardQueryContext,
  marker: (position: number) => string = () => "?",
) {
  const values: Array<string | number | boolean | null> = [];
  const parameterValues: Record<string, string | number | null> = {
    idfilial: context.branchId,
    idfuncionario: context.employeeId,
    categoria: context.category,
    detalhe_valor: context.detailValue ?? null,
    detalhe_campo: context.detailField ?? null,
    detalhe_serie: context.detailSeries ?? null,
    numero_venda: context.saleNumber ?? null,
    numerosaida: context.saleNumber ?? null,
  };
  let result = "";
  let state: "normal" | "literal" | "identifier" = "normal";
  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];
    const next = sql[index + 1];
    if (state === "normal" && current === "'") { state = "literal"; result += current; continue; }
    if (state === "normal" && current === '"') { state = "identifier"; result += current; continue; }
    if (state === "literal") {
      result += current;
      if (current === "'" && next === "'") { result += next; index += 1; continue; }
      if (current === "'") state = "normal";
      continue;
    }
    if (state === "identifier") {
      result += current;
      if (current === '"' && next === '"') { result += next; index += 1; continue; }
      if (current === '"') state = "normal";
      continue;
    }
    if (current === ":" && next !== ":") {
      const match = sql.slice(index + 1).match(/^([a-z_][a-z0-9_]*)/i);
      if (match && allowedParameters.has(match[1].toLowerCase())) {
        values.push(parameterValues[match[1].toLowerCase()] ?? null);
        result += marker(values.length);
        index += match[1].length;
        continue;
      }
    }
    result += current;
  }
  return { sql: result, params: values };
}

export async function executeDashboardQuery(sql: string, context: DashboardQueryContext, limit: number) {
  const validation = validateDashboardQuery(sql);
  if (!validation.valid) throw Object.assign(new Error(validation.error), { status: 400 });
  const prepared = prepareDashboardQuery(validation.sql, context);
  const rows = await queryFirebirdGateway<Record<string, unknown>>(prepared.sql, prepared.params, { timeoutMs: 60_000 });
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}
