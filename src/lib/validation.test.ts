import { describe, expect, it } from "vitest";
import { syncUsersSchema } from "./validation";

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
