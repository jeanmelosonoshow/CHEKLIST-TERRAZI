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

  it("parameterizes the sale number used by automatic flow decisions", () => {
    expect(prepareDashboardQuery(
      "SELECT IMPERMEABILIZACAO AS RESULTADO FROM VENDA WHERE IDFILIAL = :idfilial AND NUMEROVENDA = :numero_venda",
      { branchId: "20", employeeId: 752, category: "ADMIN", saleNumber: "12345" },
    ).params).toEqual(["20", "12345"]);
  });
  it("accepts numerosaida as an alias for flow queries", () => {
    expect(prepareDashboardQuery("SELECT * FROM SAIDA WHERE NUMEROSAIDA = :numerosaida", { branchId: "20", employeeId: 752, category: null, saleNumber: "99" }).params).toEqual(["99"]);
  });
  it("parameterizes report filters for customer and period", () => {
    expect(prepareDashboardQuery(
      "SELECT * FROM VENDA WHERE CLIENTE LIKE :cliente AND DATA BETWEEN :data_inicial AND :data_final",
      { branchId: "20", employeeId: 752, category: null, customer: "%SILVIA%", dateFrom: "2026-11-01", dateTo: "2026-11-16" },
    ).params).toEqual(["%SILVIA%", "2026-11-01", "2026-11-16"]);
  });
});
