export const dashboardDisplayFormats = [
  "auto", "text", "integer", "decimal", "currency_brl", "percent",
  "date_short", "date_long", "datetime", "month_year", "month_name", "weekday",
] as const;

export type DashboardDisplayFormat = (typeof dashboardDisplayFormats)[number];

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized = text.replace(/\s/g, "");
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const [, year, month, day, hour = "12", minute = "0", second = "0"] = iso;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  const brazilian = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (brazilian) {
    const [, day, month, year, hour = "12", minute = "0", second = "0"] = brazilian;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function numericDashboardValue(value: unknown) {
  return parseNumber(value) ?? 0;
}

export function formatDashboardValue(value: unknown, format: DashboardDisplayFormat) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "text") return String(value);
  if (format === "auto") {
    const number = parseNumber(value);
    return number === null ? String(value) : new Intl.NumberFormat("pt-BR").format(number);
  }

  const number = parseNumber(value);
  if (format === "integer") return number === null ? String(value) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(number);
  if (format === "decimal") return number === null ? String(value) : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
  if (format === "currency_brl") return number === null ? String(value) : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
  if (format === "percent") return number === null ? String(value) : new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(number);

  const date = parseDate(value);
  if (!date) return String(value);
  if (format === "date_short") return new Intl.DateTimeFormat("pt-BR").format(date);
  if (format === "date_long") return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  if (format === "datetime") return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  if (format === "month_year") return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  if (format === "month_name") return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  if (format === "weekday") return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  return String(value);
}
