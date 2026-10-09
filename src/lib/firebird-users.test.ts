import { describe, expect, it, vi } from "vitest";
import { authenticateFirebirdUser } from "./firebird-users";

describe("authenticateFirebirdUser", () => {
  it("queries the gateway with parameters and normalizes Firebird fields", async () => {
    const query = vi.fn().mockResolvedValue([{
      IDFILIAL: 1,
      CATEGORIA: "VENDEDOR",
      IDFUNCIONARIO: 752,
      NOMEFUNCIONARIO: "Jean Melo",
      LOGIN: "JEAN",
    }]);

    await expect(authenticateFirebirdUser("jean", "a".repeat(32), query)).resolves.toEqual({
      branchId: "1",
      category: "VENDEDOR",
      employeeId: 752,
      employeeName: "Jean Melo",
      login: "jean",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("SENHAWEB = ?"), ["jean", "a".repeat(32)]);
  });

  it("returns null when the credentials do not match", async () => {
    await expect(authenticateFirebirdUser("jean", "a".repeat(32), vi.fn().mockResolvedValue([]))).resolves.toBeNull();
  });
});
