import { describe, expect, it } from "vitest";
import { dashboardScenarioSchema, syncUsersSchema } from "./validation";

const validUser = {
  idfilial: "001",
  categoria: " Vendas ",
  idfuncionario: "42",
  nomefuncionario: "Maria",
  login: "MARIA",
  senha: "e7d80ffeefa212b7c5c55700e4f7193e",
};

describe("syncUsersSchema", () => {
  it("preserves textual fields and parses employee IDs as integers", () => {
    const result = syncUsersSchema.parse({ users: [validUser] });

    expect(result.users[0]).toMatchObject({
      idfilial: "001",
      categoria: "Vendas",
      idfuncionario: 42,
    });
  });

  it("rejects non-string branch/category values and non-integer employee IDs", () => {
    expect(
      syncUsersSchema.safeParse({
        users: [{ ...validUser, idfilial: 1 }],
      }).success,
    ).toBe(false);
    expect(
      syncUsersSchema.safeParse({
        users: [{ ...validUser, categoria: 1 }],
      }).success,
    ).toBe(false);
    expect(
      syncUsersSchema.safeParse({
        users: [{ ...validUser, idfuncionario: "42.5" }],
      }).success,
    ).toBe(false);
  });
});

describe("dashboardScenarioSchema", () => {
  const scenario = {
    title: "Pedidos em encomenda",
    visualization: "table",
    summarySql: "SELECT IDFILIAL, TOTAL FROM VENDA",
    valueField: "TOTAL",
    labelFormat: "text",
    valueFormat: "currency_brl",
    color: "#126b50",
    position: 1,
    active: true,
    version: 1,
  };

  it("accepts independent column formats", () => {
    expect(dashboardScenarioSchema.safeParse({
      ...scenario,
      columnFormats: [
        { field: "TOTAL", format: "currency_brl", scope: "both" },
        { field: "DATAENTREGA", format: "date_short", scope: "detail" },
      ],
    }).success).toBe(true);
  });

  it("rejects duplicate rules for the same column and scope", () => {
    expect(dashboardScenarioSchema.safeParse({
      ...scenario,
      columnFormats: [
        { field: "TOTAL", format: "currency_brl", scope: "summary" },
        { field: "total", format: "decimal", scope: "summary" },
      ],
    }).success).toBe(false);
  });
});
