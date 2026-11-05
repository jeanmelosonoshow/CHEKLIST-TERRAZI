import { describe, expect, it } from "vitest";
import { prepareDashboardQuery, validateDashboardQuery } from "./dashboard-query";

describe("dashboard query", () => {
  it("accepts read-only Firebird SQL and named parameters", () => {
    expect(validateDashboardQuery("SELECT COUNT(*) AS QUANTIDADE FROM VENDA WHERE IDFILIAL = :idfilial").valid).toBe(true);
  });

  it("blocks mutations, multiple statements and password fields", () => {
    expect(validateDashboardQuery("DELETE FROM VENDA").valid).toBe(false);
    expect(validateDashboardQuery("SELECT * FROM VENDA; SELECT * FROM CLIENTE").valid).toBe(false);
    expect(validateDashboardQuery("SELECT SENHAWEB FROM FUNCIONARIO").valid).toBe(false);
    expect(validateDashboardQuery('SELECT "SENHAWEB" FROM FUNCIONARIO').valid).toBe(false);
  });

  it("parameterizes values without replacing literals", () => {
    expect(prepareDashboardQuery(
      "SELECT ':idfilial' AS TEXTO FROM VENDA WHERE IDFILIAL = :idfilial AND STATUS = :detalhe_valor",
      { branchId: "01", employeeId: 752, category: "ADMIN", detailValue: "A" },
    )).toEqual({
      sql: "SELECT ':idfilial' AS TEXTO FROM VENDA WHERE IDFILIAL = ? AND STATUS = ?",
      params: ["01", "A"],
    });
  });
});
