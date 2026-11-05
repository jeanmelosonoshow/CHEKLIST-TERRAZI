import { describe, expect, it } from "vitest";
import { formatDashboardValue, numericDashboardValue } from "./dashboard-format";

describe("dashboard display formats", () => {
  it("formats integer, decimal, currency and percent values", () => {
    expect(formatDashboardValue(1234.56, "integer")).toBe("1.235");
    expect(formatDashboardValue(1234.5, "decimal")).toBe("1.234,50");
    expect(formatDashboardValue(1234.5, "currency_brl")).toContain("1.234,50");
    expect(formatDashboardValue(0.125, "percent")).toBe("12,5%");
  });

  it("formats dates without shifting date-only values across timezones", () => {
    expect(formatDashboardValue("2026-11-05", "date_short")).toBe("05/11/2026");
    expect(formatDashboardValue("2026-11-05", "month_name")).toBe("novembro");
    expect(formatDashboardValue("2026-11-05", "weekday")).toBe("quinta-feira");
  });

  it("parses Firebird numeric values for chart proportions", () => {
    expect(numericDashboardValue("1.234,50")).toBe(1234.5);
  });
});
